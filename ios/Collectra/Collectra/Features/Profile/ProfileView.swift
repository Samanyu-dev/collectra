import SwiftUI

/// Proves the authenticated API connection works end-to-end for this phase
/// (Bearer token → `/api/v1/me` → real profile data) — Phase 4/5 build the
/// rest of the profile/settings surface on top of this same pattern.
struct ProfileView: View {
    @EnvironmentObject private var session: SessionManager
    @StateObject private var themeManager = ThemeManager.shared
    @State private var me: Me?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var isSigningOut = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.Color_.background.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        if isLoading {
                            ProgressView()
                                .tint(Theme.Color_.textSecondary)
                                .padding(.top, Theme.Spacing.xl)
                        } else if let errorMessage {
                            VStack(spacing: Theme.Spacing.md) {
                                Text(errorMessage)
                                    .font(Theme.Typography.body(15))
                                    .foregroundStyle(Theme.Color_.textSecondary)
                                    .multilineTextAlignment(.center)
                                Button("Try Again") { Task { await loadProfile() } }
                                    .buttonStyle(PrimaryButtonStyle())
                            }
                            .padding(Theme.Spacing.lg)
                            .surface()
                            .padding(.top, Theme.Spacing.xl)
                        } else if let me {
                            profileCard(me)
                            summaryCard(me.collectionSummary)
                        }

                        appearanceCard

                        Button(role: .destructive) {
                            Task { await signOut() }
                        } label: {
                            if isSigningOut {
                                ProgressView().tint(Theme.Color_.destructive)
                            } else {
                                Text("Sign Out")
                            }
                        }
                        .font(Theme.Typography.body(16, weight: .semibold))
                        .foregroundStyle(Theme.Color_.destructive)
                        .disabled(isSigningOut)
                    }
                    .padding(Theme.Spacing.lg)
                }
            }
            .navigationTitle("Profile")
            .task { await loadProfile() }
        }
    }

    private func profileCard(_ me: Me) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text(me.name ?? me.username ?? "Collector")
                .font(Theme.Typography.display(22))
                .foregroundStyle(Theme.Color_.foreground)
            Text(me.email)
                .font(Theme.Typography.body(14))
                .foregroundStyle(Theme.Color_.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.Spacing.lg)
        .surface()
    }

    private func summaryCard(_ summary: Me.CollectionSummary) -> some View {
        VStack(spacing: Theme.Spacing.md) {
            statRow("Total Cards", "\(summary.totalCards)")
            statRow("Unique Cards", "\(summary.uniqueCards)")
            statRow("Favorites", "\(summary.favoriteCount)")
            statRow("Vaulted", "\(summary.vaultedCount)")
            statRow("Wishlist", "\(summary.wishlistCount)")
        }
        .padding(Theme.Spacing.lg)
        .surface()
    }

    private var appearanceCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Appearance")
                .font(Theme.Typography.body(13, weight: .semibold))
                .foregroundStyle(Theme.Color_.textSecondary)

            Picker("Theme", selection: $themeManager.selection) {
                ForEach(ThemeManager.Selection.allCases) { option in
                    Text(option.rawValue).tag(option)
                }
            }
            .pickerStyle(.segmented)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.Spacing.lg)
        .surface()
    }

    private func statRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(Theme.Typography.body(15))
                .foregroundStyle(Theme.Color_.textSecondary)
            Spacer()
            Text(value)
                .font(Theme.Typography.mono(15))
                .foregroundStyle(Theme.Color_.foreground)
        }
    }

    private func loadProfile() async {
        isLoading = true
        errorMessage = nil
        do {
            me = try await APIClient.shared.get("/api/v1/me")
        } catch {
            errorMessage = (error as? APIError)?.userMessage ?? "Something went wrong. Please try again."
        }
        isLoading = false
    }

    private func signOut() async {
        isSigningOut = true
        defer { isSigningOut = false }
        try? await session.signOut()
        // RootView switches to SignInView automatically via authStateChanges
        // once signOut completes — no manual navigation needed here.
    }
}
