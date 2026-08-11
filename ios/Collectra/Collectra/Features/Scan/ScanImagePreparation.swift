import UIKit

enum ScanImagePreparation {
    /// Longest edge cap for an upload — generous enough to keep card text/serial
    /// numbers readable for identification, small enough to keep the upload
    /// fast on a mobile network. Well under the backend's 20MB decoded-buffer
    /// cap (src/app/api/v1/scan/identify/route.ts) even before compression.
    static let maxDimension: CGFloat = 2000
    static let jpegQuality: CGFloat = 0.85
    /// If still this large after the primary pass, re-encode at lower quality
    /// rather than upload an unnecessarily huge file.
    static let fallbackByteCeiling = 6_000_000
    static let fallbackJpegQuality: CGFloat = 0.6

    enum PreparationError: Error, LocalizedError {
        case invalidImageData
        case encodingFailed

        var errorDescription: String? {
            switch self {
            case .invalidImageData: return "That photo couldn't be read. Please try again."
            case .encodingFailed: return "Couldn't prepare that photo for upload. Please try again."
            }
        }
    }

    /// Resizes (if needed) and JPEG-compresses raw capture data for upload.
    /// `UIImage.draw(in:)` (used by `UIGraphicsImageRenderer`) always applies
    /// `imageOrientation` when rendering, so re-encoding here also normalizes
    /// orientation — the output JPEG has orientation baked into its pixels,
    /// not just an EXIF tag a lossy re-encode could drop.
    static func prepareForUpload(_ data: Data) throws -> Data {
        guard let image = UIImage(data: data) else { throw PreparationError.invalidImageData }

        let resized = resizedIfNeeded(image, maxDimension: maxDimension)
        guard var jpeg = resized.jpegData(compressionQuality: jpegQuality) else {
            throw PreparationError.encodingFailed
        }
        if jpeg.count > fallbackByteCeiling {
            guard let smaller = resized.jpegData(compressionQuality: fallbackJpegQuality) else {
                throw PreparationError.encodingFailed
            }
            jpeg = smaller
        }
        return jpeg
    }

    /// Measures and targets actual pixel dimensions, not points — `image.size`
    /// alone is in points and silently lies once `image.scale != 1` (e.g. an
    /// image rendered at the screen's Retina scale). A capture straight off
    /// `AVCapturePhotoOutput` is always scale 1, so this distinction is inert
    /// there, but a fixed pixel cap must hold regardless of the source's scale
    /// — this was caught by a test using a scale-3 synthesized fixture image,
    /// not by real device capture.
    static func resizedIfNeeded(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let pixelWidth = image.size.width * image.scale
        let pixelHeight = image.size.height * image.scale
        let longestEdge = max(pixelWidth, pixelHeight)
        guard longestEdge > maxDimension else { return image }

        let scale = maxDimension / longestEdge
        let targetPixelSize = CGSize(width: pixelWidth * scale, height: pixelHeight * scale)

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1 // target size below is already in real pixels
        let renderer = UIGraphicsImageRenderer(size: targetPixelSize, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetPixelSize))
        }
    }
}
