import SwiftUI

/// Shared text field used by Sign In/Sign Up (and future forms) — one place
/// for the field's look, secure-entry toggle, and content-type/keyboard
/// wiring so every form gets correct autofill/keyboard behavior for free.
struct CollectraTextField: View {
    let title: String
    @Binding var text: String
    var isSecure: Bool = false
    var contentType: UITextContentType? = nil
    var keyboard: UIKeyboardType = .default
    /// Distinguishes fields with the same visible `title` across different
    /// screens (e.g. Sign In's "Password" vs. Sign Up's "Password") —
    /// SwiftUI's NavigationStack keeps a pushed-away screen's views alive
    /// off-screen, so two same-labeled fields can otherwise be
    /// simultaneously present in the accessibility tree at once, making
    /// `app.secureTextFields["Password"]` ambiguous in UI tests (confirmed
    /// live: typing landed on the wrong field and silently dropped
    /// keystrokes). Defaults to `title` for callers where that's already
    /// unique (e.g. the only "Email" field on screen).
    var identifier: String? = nil

    @State private var isRevealed = false

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            Text(title)
                .font(Theme.Typography.body(13, weight: .medium))
                .foregroundStyle(Theme.Color_.textSecondary)

            Group {
                if isSecure && !isRevealed {
                    SecureField("", text: $text)
                } else {
                    TextField("", text: $text)
                }
            }
            .font(Theme.Typography.body(17))
            .foregroundStyle(Theme.Color_.foreground)
            .textContentType(contentType)
            .keyboardType(keyboard)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
            .accessibilityIdentifier(identifier ?? title)
            .padding(.vertical, 12)
            .padding(.horizontal, Theme.Spacing.md)
            .overlay(alignment: .trailing) {
                if isSecure {
                    Button {
                        isRevealed.toggle()
                    } label: {
                        Image(systemName: isRevealed ? "eye.slash" : "eye")
                            .foregroundStyle(Theme.Color_.textSecondary)
                    }
                    .padding(.trailing, Theme.Spacing.md)
                    .accessibilityLabel(isRevealed ? "Hide password" : "Show password")
                }
            }
            .background(Theme.Color_.elevated)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous))
            .accessibilityLabel(title)
        }
    }
}
