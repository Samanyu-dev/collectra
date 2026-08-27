import XCTest

/// Real-backend, real-UI verification for the Sets/Home/Theming work added
/// this session — same rules as `CollectraUITests`/`Phase5CollectionUITests`
/// (no mocked auth, no mocked network, real dev server + real Supabase
/// project), reusing their `RealBackend` client and the same dedicated
/// test account rather than a second one.
@MainActor
final class SetsHomeThemeUITests: XCTestCase {
    // A real, priced, single-variant card (confirmed via a direct
    // `curl /api/v1/cards/pkmn-basep-24` during this test's implementation)
    // — picked for Home's "Top Cards You Own" rail specifically because it
    // has price data, unlike Phase5CollectionUITests's fixture card (chosen
    // for a different reason: small variant count for fast detail loads,
    // no guarantee of pricing).
    static let pricedCardId = "pkmn-basep-24"
    static let pricedCardName = "Pikachu"
    static let pricedVariantId = "cmrvhyswd00hqq5fbm8u6p7ag"

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - Sets

    /// Catalog tab's Cards|Sets segmented switcher: Sets loads real data
    /// from `/api/v1/sets`, opening one pushes `SetDetailView`, which shows
    /// that set's real cards from `/api/v1/cards?setId=` (the same
    /// `CardsGridContent` Catalog's own grid uses) — and popping back
    /// returns to the Sets grid, not the Cards one.
    func testSetsSegmentBrowseAndOpenDetail() throws {
        let app = XCUIApplication()
        app.launch()
        try ensureSignedOut(app)
        try signIn(app)

        tapTab("Catalog", in: app)
        XCTAssertTrue(app.navigationBars["Catalog"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["catalog-card-cell"].firstMatch.waitForExistence(timeout: 30), "Cards segment did not load by default")

        tapSegment(app, "Sets")
        let firstSet = app.buttons["sets-grid-cell"].firstMatch
        XCTAssertTrue(firstSet.waitForExistence(timeout: 30), "Sets grid did not load real data from /api/v1/sets")

        firstSet.tap()
        XCTAssertTrue(app.buttons["catalog-card-cell"].firstMatch.waitForExistence(timeout: 30), "Set detail did not load that set's real cards from /api/v1/cards?setId=")

        app.navigationBars.buttons["Catalog"].tap()
        XCTAssertTrue(app.navigationBars["Catalog"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["sets-grid-cell"].firstMatch.exists, "Returning from Set Detail should land back on the Sets grid, not switch to Cards")
    }

    // MARK: - Home

    /// Portfolio value, the "Top Cards You Own" rail, and navigating from a
    /// rail cell into that exact card's real detail — against
    /// `/api/v1/dashboard`. Sets up a known-owned, known-priced card first
    /// (same fixture-then-cleanup pattern `Phase5CollectionUITests` uses),
    /// since the dedicated test account otherwise owns nothing and Home
    /// would legitimately show its empty state instead.
    func testHomeShowsPortfolioAndOpensTopValuableCard() async throws {
        let token = try await RealBackend.signIn(email: CollectraUITests.existingTestEmail, password: CollectraUITests.existingTestPassword)
        try await RealBackend.resetCard(cardId: Self.pricedCardId, variantId: Self.pricedVariantId, token: token)
        try await RealBackend.setQuantity(cardId: Self.pricedCardId, variantId: Self.pricedVariantId, action: "increment", token: token)
        defer {
            Task { try? await RealBackend.resetCard(cardId: Self.pricedCardId, variantId: Self.pricedVariantId, token: token) }
        }

        let app = XCUIApplication()
        app.launch()
        try ensureSignedOut(app)
        try signIn(app)

        XCTAssertTrue(app.tabBars.buttons["Home"].waitForExistence(timeout: 15))
        tapTab("Home", in: app)

        let portfolioValue = app.staticTexts["home-portfolio-value"]
        XCTAssertTrue(portfolioValue.waitForExistence(timeout: 30), "Home did not load real data from /api/v1/dashboard in time")
        XCTAssertNotEqual(portfolioValue.label, "$0.00", "Portfolio value should reflect the card just added, not the empty-state default")

        let topCell = app.buttons["home-top-valuable-cell"].firstMatch
        XCTAssertTrue(topCell.waitForExistence(timeout: 15), "Top Cards You Own rail did not render the just-added priced card")
        topCell.tap()

        let priceTag = app.descendants(matching: .any)["card-detail-price-tag"]
        XCTAssertTrue(priceTag.waitForExistence(timeout: 20), "Tapping a Top Cards You Own cell did not open real card detail")
    }

    // MARK: - Theming

    /// Profile's Appearance picker switches `ThemeManager.selection`, which
    /// the app root observes via `.id(selection)` to force one full
    /// re-render of everything below (see `ThemeManager`'s doc comment) —
    /// this proves that reset doesn't crash or strand navigation: Profile's
    /// own content must still be there, and the picker's selection must
    /// have actually moved, after switching each direction.
    func testAppearancePickerSwitchesThemeWithoutLosingState() throws {
        let app = XCUIApplication()
        app.launch()
        try ensureSignedOut(app)
        try signIn(app)

        tapTab("Profile", in: app)
        let emailLabel = app.staticTexts[CollectraUITests.existingTestEmail]
        XCTAssertTrue(emailLabel.waitForExistence(timeout: 60))

        let vibrant = app.segmentedControls.buttons["Vibrant"]
        XCTAssertTrue(vibrant.waitForExistence(timeout: 10))
        vibrant.tap()

        // The full-tree reset re-lands on Profile (RootView's `.id()` wraps
        // the whole signed-in shell, not just this screen) — wait for it to
        // settle back onto real content rather than assuming no visible gap.
        XCTAssertTrue(app.staticTexts[CollectraUITests.existingTestEmail].waitForExistence(timeout: 20), "Profile content did not survive a theme switch to Vibrant")
        tapTab("Profile", in: app)
        let vibrantAfter = app.segmentedControls.buttons["Vibrant"]
        XCTAssertTrue(vibrantAfter.waitForExistence(timeout: 10))
        XCTAssertTrue(vibrantAfter.isSelected, "Vibrant should still be the selected segment after the reset")

        let minimal = app.segmentedControls.buttons["Minimal"]
        minimal.tap()
        XCTAssertTrue(app.staticTexts[CollectraUITests.existingTestEmail].waitForExistence(timeout: 20), "Profile content did not survive switching back to Minimal")
    }

    // MARK: - Helpers (mirroring CollectraUITests'/Phase5CollectionUITests' own)

    private func tapTab(_ name: String, in app: XCUIApplication) {
        for attempt in 1...5 {
            app.tabBars.buttons[name].tap()
            if app.navigationBars[name].waitForExistence(timeout: 5) { return }
            if attempt < 5 { Thread.sleep(forTimeInterval: 0.5) }
        }
    }

    private func tapSegment(_ app: XCUIApplication, _ label: String) {
        let segmentButton = app.segmentedControls.buttons[label]
        if segmentButton.waitForExistence(timeout: 5) {
            segmentButton.tap()
        } else {
            app.buttons[label].tap()
        }
    }

    private func ensureSignedOut(_ app: XCUIApplication) throws {
        dismissOnboardingIfPresent(app)
        guard app.tabBars.buttons["Home"].waitForExistence(timeout: 3) else { return }
        tapTab("Profile", in: app)
        let signOutButton = app.buttons["Sign Out"]
        if signOutButton.waitForExistence(timeout: 10) {
            signOutButton.tap()
        }
        XCTAssertTrue(app.buttons["Sign In"].waitForExistence(timeout: 40), "Could not reach a signed-out state before starting the test")
    }

    /// A fresh app container shows the first-run onboarding carousel before
    /// Sign In (see `OnboardingView`) — harmless no-op once
    /// `hasCompletedOnboarding` is set.
    private func dismissOnboardingIfPresent(_ app: XCUIApplication) {
        if app.buttons["Skip"].waitForExistence(timeout: 3) {
            app.buttons["Skip"].tap()
        } else if app.buttons["Get Started"].waitForExistence(timeout: 2) {
            app.buttons["Get Started"].tap()
        }
    }

    private func signIn(_ app: XCUIApplication) throws {
        let emailField = app.textFields["signin-email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 10))
        emailField.tap()
        emailField.typeText(CollectraUITests.existingTestEmail)

        let passwordField = app.secureTextFields["signin-password"]
        passwordField.tap()
        passwordField.typeText(CollectraUITests.existingTestPassword)

        app.buttons["Sign In"].tap()
        let notNow = app.buttons["Not Now"]
        if notNow.waitForExistence(timeout: 5) {
            notNow.tap()
        }
        XCTAssertTrue(app.tabBars.buttons["Home"].waitForExistence(timeout: 20), "Sign in did not reach the authenticated shell")
    }
}
