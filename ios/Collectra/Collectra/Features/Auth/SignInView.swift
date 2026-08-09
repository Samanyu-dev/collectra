import SwiftUI

struct SignInView: View {
    @EnvironmentObject private var session: SessionManager
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSignUp = false
    @FocusState private var focusedField: Field?

    private enum Field { case email, password }

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty && !isLoading
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Color_.background.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        VStack(spacing: Theme.Spacing.xs) {
                            Text("Collectra")
                                .font(Theme.Typography.display(34))
                                .foregroundStyle(Theme.Color_.foreground)
                            Text("Sign in to your collection")
                                .font(Theme.Typography.body(15))
                                .foregroundStyle(Theme.Color_.textSecondary)
                        }
                        .padding(.top, Theme.Spacing.xl)

                        VStack(spacing: Theme.Spacing.md) {
                            CollectraTextField(title: "Email", text: $email, contentType: .emailAddress, keyboard: .emailAddress, identifier: "signin-email")
                                .focused($focusedField, equals: .email)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .password }

                            CollectraTextField(title: "Password", text: $password, isSecure: true, contentType: .password, identifier: "signin-password")
                                .focused($focusedField, equals: .password)
                                .submitLabel(.go)
                                .onSubmit { Task { await signIn() } }

                            if let errorMessage {
                                Text(errorMessage)
                                    .font(Theme.Typography.body(14))
                                    .foregroundStyle(Theme.Color_.destructive)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .accessibilityAddTraits(.isStaticText)
                            }

                            Button {
                                Task { await signIn() }
                            } label: {
                                if isLoading {
                                    ProgressView().tint(Theme.Color_.background)
                                } else {
                                    Text("Sign In")
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(!canSubmit)
                            .accessibilityLabel("Sign In")
                        }
                        .padding(Theme.Spacing.lg)
                        .surface()

                        Button("Don't have an account? Sign Up") {
                            showSignUp = true
                        }
                        .font(Theme.Typography.body(15, weight: .medium))
                        .foregroundStyle(Theme.Color_.textSecondary)
                    }
                    .padding(Theme.Spacing.lg)
                }
            }
            .navigationDestination(isPresented: $showSignUp) {
                SignUpView()
            }
        }
        .preferredColorScheme(.dark)
    }

    private func signIn() async {
        guard canSubmit else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            try await session.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
