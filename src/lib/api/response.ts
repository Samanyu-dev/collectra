import "server-only";
import { NextResponse } from "next/server";

/**
 * `/api/v1/**` response envelope — deliberately small and stable so the iOS
 * client can decode every route with the same two Codable shapes. Never put
 * anything here that isn't already safe to hand to any caller (this file has
 * no auth context of its own).
 */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface ApiSuccessBody<T> {
  data: T;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: string, message: string, status: number): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Well-known error codes every /api/v1 route should reuse rather than inventing ad hoc ones. */
export const ApiErrorCodes = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_TOKEN: "INVALID_TOKEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  FORBIDDEN: "FORBIDDEN",
  PAYWALL: "PAYWALL",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * Thrown by request-validation helpers and caught once at each route's top
 * level — lets route bodies read like straight-line logic instead of nested
 * if/return validation, while still never leaking a raw stack trace/Prisma
 * error to the client.
 */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/**
 * Wraps a route handler body: catches ApiRequestError (including
 * ApiAuthError, which extends it) and turns it into the matching JSON error
 * response; anything else is an unexpected server error — logged server-side
 * in full, but the client only ever sees a generic 500 with no internal
 * details (message, stack, Prisma error shape, etc.).
 */
export async function withApiErrorHandling<T>(
  handler: () => Promise<NextResponse<T> | NextResponse<ApiErrorBody>>
): Promise<NextResponse<T> | NextResponse<ApiErrorBody>> {
  try {
    return await handler();
  } catch (e) {
    if (e instanceof ApiRequestError) {
      return apiError(e.code, e.message, e.status);
    }
    console.error("[api/v1] unexpected error:", e);
    return apiError(ApiErrorCodes.INTERNAL_ERROR, "Something went wrong. Please try again.", 500);
  }
}
