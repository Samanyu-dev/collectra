import SwiftUI

/// Phase 6C/6D's slice: quota gate → permission → camera → capture →
/// upload → response received, then STOP. No candidate/confirmation UI here
/// — see ScanState's doc comment for the explicit boundary.
struct ScanView: View {
    @StateObject private var viewModel = ScanViewModel()

    var body: some View {
        ZStack {
            Theme.Color_.background.ignoresSafeArea()

            switch viewModel.state {
            case .checkingQuota, .checkingPermission:
                loadingState(message: "Getting things ready…")

            case .quotaBlocked(let quota):
                quotaBlockedState(quota: quota)

            case .permissionDenied:
                permissionDeniedState(restricted: false)

            case .permissionRestricted:
                permissionDeniedState(restricted: true)

            case .cameraUnavailable(let message):
                messageState(
                    systemImage: "camera.metering.unknown",
                    title: "Camera unavailable",
                    message: message,
                    identifier: "scan-camera-unavailable-view",
                    primaryAction: ("Try Again", { viewModel.retry() })
                )

            case .ready:
                cameraState

            case .capturing, .preparingImage, .uploading:
                loadingState(message: uploadStageMessage)

            case .received(let response):
                receivedState(response: response)

            case .error(let message):
                messageState(
                    systemImage: "exclamationmark.triangle",
                    title: "Something went wrong",
                    message: message,
                    identifier: "scan-error-view",
                    primaryAction: ("Try Again", { viewModel.retry() })
                )

            case .cancelled:
                messageState(
                    systemImage: "camera",
                    title: "Scan cancelled",
                    message: nil,
                    identifier: "scan-cancelled-view",
                    primaryAction: ("Start Scanning", { viewModel.retry() })
                )
            }
        }
        .onAppear { viewModel.onAppear() }
        .onDisappear { viewModel.onDisappear() }
        .preferredColorScheme(.dark)
    }

    private var uploadStageMessage: String {
        switch viewModel.state {
        case .capturing: return "Capturing…"
        case .preparingImage: return "Preparing image…"
        case .uploading: return "Uploading…"
        default: return "Working…"
        }
    }

    // MARK: - States

    private var cameraState: some View {
        ZStack {
            CameraPreviewView(session: viewModel.captureSession)
                .ignoresSafeArea()

            // Card-position guidance — a simple framing rectangle, not a
            // decorative flourish: it's the one instruction the user needs
            // ("where do I put the card") before tapping capture.
            RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous)
                .strokeBorder(Theme.Color_.foreground.opacity(0.6), lineWidth: 2)
                .aspectRatio(2.5 / 3.5, contentMode: .fit)
                .padding(.horizontal, Theme.Spacing.xl)

            VStack {
                HStack {
                    Button {
                        viewModel.cancel()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.Color_.foreground)
                            .frame(width: 40, height: 40)
                            .background(.ultraThinMaterial, in: Circle())
                    }
                    .accessibilityIdentifier("scan-cancel-button")
                    .accessibilityLabel("Cancel scanning")

                    Spacer()
                }
                .padding(Theme.Spacing.md)
                .padding(.top, Theme.Spacing.sm)

                Spacer()

                Text("Position the card inside the frame")
                    .font(Theme.Typography.body(14, weight: .medium))
                    .foregroundStyle(Theme.Color_.foreground)
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, Theme.Spacing.sm)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, Theme.Spacing.lg)

                Button {
                    viewModel.capture()
                } label: {
                    Circle()
                        .fill(Theme.Color_.foreground)
                        .frame(width: 72, height: 72)
                        .overlay(Circle().strokeBorder(Theme.Color_.background, lineWidth: 4).padding(4))
                }
                .accessibilityIdentifier("scan-capture-button")
                .accessibilityLabel("Capture photo")
                .padding(.bottom, Theme.Spacing.xl)
            }
        }
    }

    private func loadingState(message: String) -> some View {
        VStack(spacing: Theme.Spacing.md) {
            ProgressView()
                .tint(Theme.Color_.foreground)
            Text(message)
                .font(Theme.Typography.body(15))
                .foregroundStyle(Theme.Color_.textSecondary)
        }
    }

    private func quotaBlockedState(quota: ScanQuotaStatus) -> some View {
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: "sparkles")
                .font(.system(size: 40))
                .foregroundStyle(Theme.Color_.foreground)
            Text("Weekly scan limit reached")
                .font(Theme.Typography.display(20))
                .foregroundStyle(Theme.Color_.foreground)
            Text("You've used \(quota.scansUsedThisWeek) of \(quota.scanLimitPerWeek) free scans this week. Upgrade to Pro for unlimited scanning.")
                .font(Theme.Typography.body(15))
                .foregroundStyle(Theme.Color_.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.Spacing.lg)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("scan-quota-blocked-view")
        .padding(Theme.Spacing.lg)
    }

    private func permissionDeniedState(restricted: Bool) -> some View {
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: "camera.fill")
                .font(.system(size: 40))
                .foregroundStyle(Theme.Color_.textTertiary)
            Text(restricted ? "Camera unavailable" : "Camera access needed")
                .font(Theme.Typography.display(20))
                .foregroundStyle(Theme.Color_.foreground)
            Text(
                restricted
                    ? "Camera access is restricted on this device and can't be changed here."
                    : "Collectra needs camera access to scan and identify cards. You can enable it in Settings."
            )
            .font(Theme.Typography.body(15))
            .foregroundStyle(Theme.Color_.textSecondary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, Theme.Spacing.lg)

            if !restricted {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.top, Theme.Spacing.sm)
                .accessibilityIdentifier("scan-open-settings-button")
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("scan-permission-denied-view")
        .padding(Theme.Spacing.lg)
    }

    private func receivedState(response: ScanIdentifyResponse) -> some View {
        // Diagnostic terminal state for this phase only — deliberately not a
        // candidate-card UI (Phase 6G's job). Confirms the round trip worked:
        // the server received the image, ran identification, and this app
        // decoded a real response.
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 40))
                .foregroundStyle(Theme.Color_.rarityUncommon)
            Text("Scan received")
                .font(Theme.Typography.display(20))
                .foregroundStyle(Theme.Color_.foreground)

            VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                diagnosticRow("OCR configured", response.ocrConfigured ? "Yes" : "No")
                if let label = response.confidenceLabel {
                    diagnosticRow("Confidence", label)
                }
                diagnosticRow("Resolved match", response.resolved != nil ? "1" : "0")
                diagnosticRow("Candidates", "\(response.candidates?.count ?? 0)")
            }
            .padding(Theme.Spacing.md)
            .surface()
            .padding(.horizontal, Theme.Spacing.lg)

            Button("Done") { viewModel.cancel() }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.top, Theme.Spacing.sm)
                .accessibilityIdentifier("scan-done-button")
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("scan-received-view")
        .padding(Theme.Spacing.lg)
    }

    private func diagnosticRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(Theme.Typography.mono(13))
                .foregroundStyle(Theme.Color_.textSecondary)
            Spacer()
            Text(value)
                .font(Theme.Typography.mono(13, weight: .semibold))
                .foregroundStyle(Theme.Color_.foreground)
        }
    }

    private func messageState(
        systemImage: String,
        title: String,
        message: String?,
        identifier: String,
        primaryAction: (String, () -> Void)
    ) -> some View {
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: systemImage)
                .font(.system(size: 40))
                .foregroundStyle(Theme.Color_.textTertiary)
            Text(title)
                .font(Theme.Typography.display(20))
                .foregroundStyle(Theme.Color_.foreground)
            if let message {
                Text(message)
                    .font(Theme.Typography.body(15))
                    .foregroundStyle(Theme.Color_.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.Spacing.lg)
            }
            Button(primaryAction.0, action: primaryAction.1)
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, Theme.Spacing.lg)
                .padding(.top, Theme.Spacing.sm)
                .accessibilityIdentifier("scan-retry-button")
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(identifier)
        .padding(Theme.Spacing.lg)
    }
}
