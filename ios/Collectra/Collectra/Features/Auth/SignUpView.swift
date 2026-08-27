import SwiftUI

struct SignUpView: View {
    @EnvironmentObject private var session: SessionManager
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var confirmationMessage: String?
    @FocusState private var focusedField: Field?

    private enum Field { case email, password, confirm }

    private var validationError: String? {
        if password.isEmpty { return nil }
        if password.count < 8 { return "Password must be at least 8 characters." }
        if !confirmPassword.isEmpty && password != confirmPassword { return "Passwords don't match." }
        return nil
    }

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty
            && password.count >= 8
            && password == confirmPassword
            && !isLoading
    }

    var body: some View {
        ZStack {
            AmbientBackground()
            ScrollView {
                VStack(spacing: Theme.Spacing.lg) {
                    VStack(spacing: Theme.Spacing.xs) {
                        Text("Create your account")
                            .font(Theme.Typography.display(26))
                            .foregroundStyle(Theme.Color_.foreground)
                        Text("Start tracking your collection")
                            .font(Theme.Typography.body(15))
                            .foregroundStyle(Theme.Color_.textSecondary)
                    }
                    .padding(.top, Theme.Spacing.lg)

                    if let confirmationMessage {
                        VStack(spacing: Theme.Spacing.md) {
                            Text(confirmationMessage)
                                .font(Theme.Typography.body(15))
                                .foregroundStyle(Theme.Color_.foreground)
                                .multilineTextAlignment(.center)
                            Button("Back to Sign In") { dismiss() }
                                .buttonStyle(PrimaryButtonStyle())
                        }
                        .padding(Theme.Spacing.lg)
                        .surface()
                    } else {
                        VStack(spacing: Theme.Spacing.md) {
                            CollectraTextField(title: "Email", text: $email, contentType: .emailAddress, keyboard: .emailAddress, identifier: "signup-email")
                                .focused($focusedField, equals: .email)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .password }

                            // .password, not .newPassword — the latter opts into iOS's
                            // automatic strong-password suggestion UI, which can
                            // intercept/replace typed input (confirmed live: typing a
                            // 20-char password into a .newPassword field left the bound
                            // state under 8 characters). Sign In's password field
                            // already uses plain .password reliably.
                            CollectraTextField(title: "Password", text: $password, isSecure: true, contentType: .password, identifier: "signup-password")
                                .focused($focusedField, equals: .password)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .confirm }

                            CollectraTextField(title: "Confirm Password", text: $confirmPassword, isSecure: true, contentType: .password, identifier: "signup-confirm-password")
                                .focused($focusedField, equals: .confirm)
                                .submitLabel(.go)
                                .onSubmit { Task { await signUp() } }

                            if let validationError {
                                Text(validationError)
                                    .font(Theme.Typography.body(13))
                                    .foregroundStyle(Theme.Color_.textTertiary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            if let errorMessage {
                                Text(errorMessage)
                                    .font(Theme.Typography.body(14))
                                    .foregroundStyle(Theme.Color_.destructive)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            Button {
                                Task { await signUp() }
                            } label: {
                                if isLoading {
                                    ProgressView().tint(Theme.Color_.background)
                                } else {
                                    Text("Sign Up")
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(!canSubmit)
                            .accessibilityLabel("Sign Up")
                        }
                        .padding(Theme.Spacing.lg)
                        .surface()

                        Button("Already have an account? Sign In") { dismiss() }
                            .font(Theme.Typography.body(15, weight: .medium))
                            .foregroundStyle(Theme.Color_.textSecondary)
                    }
                }
                .padding(Theme.Spacing.lg)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .preferredColorScheme(.dark)
    }

    private func signUp() async {
        guard canSubmit else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await session.signUp(email: email.trimmingCharacters(in: .whitespaces), password: password)
            // If the project requires email confirmation, signUp succeeds
            // without an active session — surface that clearly rather than
            // silently doing nothing (RootView will switch to the signed-in
            // shell on its own via authStateChanges if a session WAS granted).
            if case .signedOut = session.state {
                confirmationMessage = "Check your email to confirm your account, then sign in."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
