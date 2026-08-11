import AVFoundation
import SwiftUI

/// The one place this app bridges AVFoundation into SwiftUI — a thin
/// `UIViewRepresentable` binding an `AVCaptureVideoPreviewLayer` to the same
/// `AVCaptureSession` `CameraService` drives. Holds no state and makes no
/// session decisions of its own.
struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewLayerView {
        let view = PreviewLayerView()
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewLayerView, context: Context) {}
}

final class PreviewLayerView: UIView {
    override static var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var videoPreviewLayer: AVCaptureVideoPreviewLayer {
        // swiftlint:disable:next force_cast
        layer as! AVCaptureVideoPreviewLayer
    }
}
