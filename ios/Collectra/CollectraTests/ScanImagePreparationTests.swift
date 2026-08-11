import XCTest
@testable import Collectra

final class ScanImagePreparationTests: XCTestCase {
    /// scale = 1 deliberately — a real `AVCapturePhotoOutput` capture is
    /// always scale 1 (points == pixels), unlike a renderer's default which
    /// matches the simulator's Retina screen scale. Using the default here
    /// masked a real points-vs-pixels bug in resizedIfNeeded (see its own
    /// doc comment) until this fixture pinned scale explicitly.
    private func makeImage(width: CGFloat, height: CGFloat) -> UIImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format)
        return renderer.image { ctx in
            UIColor.blue.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
        }
    }

    func testImageUnderMaxDimensionIsNotResized() {
        let image = makeImage(width: 800, height: 600)
        let result = ScanImagePreparation.resizedIfNeeded(image, maxDimension: 2000)

        XCTAssertEqual(result.size.width, 800)
        XCTAssertEqual(result.size.height, 600)
    }

    func testImageOverMaxDimensionIsScaledDownPreservingAspectRatio() {
        let image = makeImage(width: 4000, height: 3000)
        let result = ScanImagePreparation.resizedIfNeeded(image, maxDimension: 2000)

        XCTAssertEqual(result.size.width, 2000)
        XCTAssertEqual(result.size.height, 1500)
    }

    func testPrepareForUploadProducesValidDecodableJPEGUnderMaxDimension() throws {
        let raw = makeImage(width: 3000, height: 2000).jpegData(compressionQuality: 1.0)!

        let prepared = try ScanImagePreparation.prepareForUpload(raw)
        let decoded = try XCTUnwrap(UIImage(data: prepared))

        XCTAssertLessThanOrEqual(max(decoded.size.width, decoded.size.height), ScanImagePreparation.maxDimension)
    }

    func testPrepareForUploadThrowsOnInvalidData() {
        let garbage = Data([0x00, 0x01, 0x02])

        XCTAssertThrowsError(try ScanImagePreparation.prepareForUpload(garbage)) { error in
            guard case .invalidImageData = error as? ScanImagePreparation.PreparationError else {
                return XCTFail("expected .invalidImageData, got \(error)")
            }
        }
    }
}
