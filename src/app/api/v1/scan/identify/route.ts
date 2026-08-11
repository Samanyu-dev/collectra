import { requireApiUser } from "@/lib/auth/api";
import { uploadScanPhotoForUser, identifyScanForUser } from "@/lib/actions/scanner";
import { apiSuccess, withApiErrorHandling, ApiRequestError, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

const MAX_DECODED_BYTES = 20 * 1024 * 1024; // 20MB — generous for a single card photo, not an open upload endpoint

interface IdentifyRequestBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  fileName?: unknown;
}

/**
 * POST /api/v1/scan/identify — { imageBase64, mimeType, fileName? }.
 * Combines the web's two-step upload-then-identify Server Action flow
 * (src/lib/actions/scanner.ts's uploadScanPhoto/identifyScan) into one call
 * for a mobile client, to avoid an extra round trip over a mobile network —
 * same underlying domain logic (uploadScanPhotoForUser/identifyScanForUser),
 * no duplicated OCR/matching code. Base64-in-JSON rather than multipart:
 * the existing iOS APIClient only speaks JSON today.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);

    let body: IdentifyRequestBody;
    try {
      body = await req.json();
    } catch {
      throw new ApiRequestError(400, ApiErrorCodes.VALIDATION_ERROR, "Request body must be valid JSON.");
    }

    if (typeof body.imageBase64 !== "string" || body.imageBase64.length === 0) {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "`imageBase64` is required.");
    }
    const mimeType = typeof body.mimeType === "string" && body.mimeType.length > 0 ? body.mimeType : "image/jpeg";
    const fileName = typeof body.fileName === "string" && body.fileName.length > 0 ? body.fileName : "scan.jpg";

    let buffer: Buffer;
    try {
      buffer = Buffer.from(body.imageBase64, "base64");
    } catch {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "`imageBase64` is not valid base64.");
    }
    if (buffer.byteLength === 0) {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "Decoded image is empty.");
    }
    if (buffer.byteLength > MAX_DECODED_BYTES) {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "Image is too large.");
    }

    const { mediaId, previewUrl } = await uploadScanPhotoForUser(user.id, buffer, fileName, mimeType);
    const result = await identifyScanForUser(user.id, mediaId);

    return apiSuccess({ ...result, mediaId, previewUrl });
  });
}
