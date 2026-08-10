import SwiftUI

/// Card Detail's Phase 5 mutation controls: a quantity stepper plus
/// favorite/vault/wishlist toggles, all driven by `CardDetailViewModel`.
/// Favorite/Vault are disabled (with an explanatory line) when the selected
/// variant has no `instanceId` — unowned, so there's nothing to favorite or
/// vault yet (Phase 5 requirement §7/§8: never manufacture an instance id).
struct CollectionControlsView: View {
    @ObservedObject var viewModel: CardDetailViewModel
    let variant: CardVariant
    let isWishlisted: Bool

    private var canToggleInstanceState: Bool { variant.instanceId != nil }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            Text("YOUR COLLECTION")
                .font(Theme.Typography.body(11, weight: .semibold))
                .foregroundStyle(Theme.Color_.textTertiary)
                .tracking(1)

            quantityStepper

            HStack(spacing: Theme.Spacing.md) {
                toggleButton(
                    title: "Favorite",
                    systemImage: variant.favorited ? "heart.fill" : "heart",
                    isActive: variant.favorited,
                    isLoading: viewModel.isMutatingFavorite,
                    isEnabled: canToggleInstanceState,
                    activeColor: Theme.Color_.destructive,
                    identifier: "toggle-favorite",
                    action: { viewModel.toggleFavorite() }
                )
                toggleButton(
                    title: "Vault",
                    systemImage: variant.vaulted ? "lock.fill" : "lock",
                    isActive: variant.vaulted,
                    isLoading: viewModel.isMutatingVault,
                    isEnabled: canToggleInstanceState,
                    activeColor: Theme.Color_.raritySAR,
                    identifier: "toggle-vault",
                    action: { viewModel.toggleVault() }
                )
                toggleButton(
                    title: "Wishlist",
                    systemImage: isWishlisted ? "star.fill" : "star",
                    isActive: isWishlisted,
                    isLoading: viewModel.isMutatingWishlist,
                    isEnabled: true,
                    activeColor: Theme.Color_.rarityIllustration,
                    identifier: "toggle-wishlist",
                    action: { viewModel.toggleWishlist() }
                )
            }

            if !canToggleInstanceState {
                Text("Add this variant to your Shelf to favorite or vault it.")
                    .font(Theme.Typography.body(11))
                    .foregroundStyle(Theme.Color_.textTertiary)
            }

            if let error = viewModel.mutationErrorMessage {
                Text(error)
                    .font(Theme.Typography.body(12))
                    .foregroundStyle(Theme.Color_.destructive)
            }
        }
    }

    private var quantityStepper: some View {
        HStack(spacing: Theme.Spacing.lg) {
            Text("Quantity")
                .font(Theme.Typography.body(14, weight: .medium))
                .foregroundStyle(Theme.Color_.foreground)

            Spacer()

            HStack(spacing: Theme.Spacing.md) {
                stepButton(
                    systemImage: "minus",
                    enabled: variant.ownedQuantity > 0 && !viewModel.isMutatingQuantity,
                    identifier: "quantity-decrement"
                ) {
                    viewModel.changeQuantity(.decrement)
                }

                ZStack {
                    if viewModel.isMutatingQuantity {
                        ProgressView().tint(Theme.Color_.textSecondary)
                    } else {
                        Text("\(variant.ownedQuantity)")
                            .font(Theme.Typography.mono(17, weight: .semibold))
                            .foregroundStyle(Theme.Color_.foreground)
                            .accessibilityIdentifier("quantity-value")
                    }
                }
                .frame(minWidth: 28)

                stepButton(
                    systemImage: "plus",
                    enabled: !viewModel.isMutatingQuantity,
                    identifier: "quantity-increment"
                ) {
                    viewModel.changeQuantity(.increment)
                }
            }
        }
    }

    private func stepButton(systemImage: String, enabled: Bool, identifier: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(enabled ? Theme.Color_.background : Theme.Color_.textTertiary)
                .frame(width: 32, height: 32)
                .background(enabled ? Theme.Color_.foreground : Theme.Color_.surface)
                .clipShape(Circle())
        }
        .disabled(!enabled)
        .accessibilityIdentifier(identifier)
    }

    private func toggleButton(
        title: String,
        systemImage: String,
        isActive: Bool,
        isLoading: Bool,
        isEnabled: Bool,
        activeColor: Color,
        identifier: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                if isLoading {
                    ProgressView()
                        .tint(isActive ? activeColor : Theme.Color_.textSecondary)
                        .frame(height: 20)
                } else {
                    Image(systemName: systemImage)
                        .font(.system(size: 18))
                        .foregroundStyle(isActive ? activeColor : Theme.Color_.textSecondary)
                        .frame(height: 20)
                }
                Text(title)
                    .font(Theme.Typography.body(10, weight: .medium))
                    .foregroundStyle(Theme.Color_.textTertiary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Theme.Spacing.sm)
            .background(Theme.Color_.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.sm, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled || isLoading)
        .opacity(isEnabled ? 1 : 0.4)
        .accessibilityIdentifier(identifier)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }
}
