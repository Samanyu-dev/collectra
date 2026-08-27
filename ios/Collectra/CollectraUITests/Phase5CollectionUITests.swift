import XCTest

/// Runs against the REAL running Collectra backend — same rule as
/// `CollectraUITests` (no mocked auth, no mocked network). `RealBackend` is
/// a tiny direct HTTP client used ONLY for test setup (resetting a fixture
/// card to a known state before a golden-path run) and for independently
/// cross-checking server state after a UI-driven mutation — every actual
/// assertion about app behavior still goes through real UI taps against
/// `XCUIApplication`, never through this client. Internal (not
/// file-private) so `SetsHomeThemeUITests` reuses it too instead of a
/// second copy of the same fixture-setup client.
enum RealBackend {
    static let apiBaseURL = URL(string: "http://localhost:3000")!
    static let supabaseURL = URL(string: "https://fnynunzvwvfgiucemmeo.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZueW51bnp2d3ZmZ2l1Y2VtbWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDY2MzUsImV4cCI6MjEwMDIyMjYzNX0.oDQl-94WIHgNb_c0d6ppAkR76q8DDvm70MjXSpjsXsE"

    /// This dev environment showed one transient `nw_read_request_report
    /// "Operation timed out"` during verification (confirmed unrelated to
    /// app/data correctness — a follow-up fresh request immediately returned
    /// the correct, expected data). A couple of retries makes this fixture
    /// client resilient to that same kind of one-off local network blip
    /// without masking a genuine, repeatable failure.
    static func dataWithRetry(for request: URLRequest, attempts: Int = 3) async throws -> Data {
        var lastError: Error?
        for attempt in 1...attempts {
            do {
                let (data, _) = try await URLSession.shared.data(for: request)
                return data
            } catch {
                lastError = error
                if attempt < attempts {
                    try? await Task.sleep(nanoseconds: 1_000_000_000)
                }
            }
        }
        throw lastError ?? NSError(domain: "RealBackend", code: 99, userInfo: [NSLocalizedDescriptionKey: "request failed with no error"])
    }

    static func signIn(email: String, password: String) async throws -> String {
        var components = URLComponents(url: supabaseURL.appendingPathComponent("/auth/v1/token"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "password")]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])
        let data = try await dataWithRetry(for: request)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let token = json["access_token"] as? String else {
            throw NSError(domain: "RealBackend", code: 1, userInfo: [NSLocalizedDescriptionKey: "sign-in failed: \(String(data: data, encoding: .utf8) ?? "")"])
        }
        return token
    }

    static func getCard(id: String, token: String) async throws -> [String: Any] {
        var request = URLRequest(url: apiBaseURL.appendingPathComponent("/api/v1/cards/\(id)"))
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let data = try await dataWithRetry(for: request)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let payload = json["data"] as? [String: Any] else {
            throw NSError(domain: "RealBackend", code: 2, userInfo: [NSLocalizedDescriptionKey: "unexpected card response: \(String(data: data, encoding: .utf8) ?? "")"])
        }
        return payload
    }

    /// Polls `getCard` until `until` accepts the response or `timeout`
    /// elapses. Needed because, observed live and reproduced independently
    /// (isolated curl round trips against the same account/card were
    /// consistent; the direct DB row was correct both times), a `getCard`
    /// fired immediately after several other real requests (Shelf/Vault/
    /// Wishlist loads, a fresh card reopen) can occasionally return a
    /// transient stale/zeroed read on this dev server — a request-
    /// concurrency artifact of the setup, not a data-persistence bug. A
    /// one-shot cross-check can't distinguish "genuinely wrong" from "not
    /// settled yet"; polling can.
    static func pollCard(id: String, token: String, timeout: TimeInterval = 30, until: @Sendable ([[String: Any]], [String: Any]) -> Bool) async throws -> [String: Any] {
        let deadline = Date().addingTimeInterval(timeout)
        var last: [String: Any] = [:]
        while Date() < deadline {
            last = try await getCard(id: id, token: token)
            let variants = last["variants"] as? [[String: Any]] ?? []
            if until(variants, last) { return last }
            try? await Task.sleep(nanoseconds: 1_500_000_000)
        }
        return last
    }

    static func setQuantity(cardId: String, variantId: String, action: String, token: String) async throws {
        var request = URLRequest(url: apiBaseURL.appendingPathComponent("/api/v1/cards/\(cardId)/variants/\(variantId)/quantity"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["action": action])
        _ = try await URLSession.shared.data(for: request)
    }

    static func toggleWishlist(cardId: String, token: String) async throws {
        var request = URLRequest(url: apiBaseURL.appendingPathComponent("/api/v1/cards/\(cardId)/wishlist"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        _ = try await URLSession.shared.data(for: request)
    }

    /// Brings the target variant/card back to a known-clean state (quantity
    /// 0, not wishlisted) via the real API before a golden-path run starts —
    /// setup only. Favorite/vault live on the Instance, which decrementing
    /// to 0 deletes, so they don't need separate resetting.
    static func resetCard(cardId: String, variantId: String, token: String) async throws {
        for _ in 0..<10 {
            let card = try await getCard(id: cardId, token: token)
            guard let variants = card["variants"] as? [[String: Any]],
                  let variant = variants.first(where: { $0["id"] as? String == variantId }),
                  let quantity = variant["ownedQuantity"] as? Int, quantity > 0 else { break }
            try await setQuantity(cardId: cardId, variantId: variantId, action: "decrement", token: token)
        }
        let card = try await getCard(id: cardId, token: token)
        if (card["viewer"] as? [String: Any])?["isWishlisted"] as? Bool == true {
            try await toggleWishlist(cardId: cardId, token: token)
        }
    }
}

/// Real-backend, real-UI verification of Phase 5 (Shelf/Vault/Wishlist +
/// Card Detail mutations) — driven by actual `XCUIApplication` taps against
/// the live dev server + real Supabase project, not unit tests. Fixture
/// card `pkmn-bw6-56` ("Gothorita", Dragons Exalted) was picked via a direct
/// DB query for a real card with exactly 2 variants, small enough that its
/// full detail payload returns quickly (a 61-variant card found by the same
/// query timed out past 60s — see the Phase 5 verification report).
@MainActor
final class Phase5CollectionUITests: XCTestCase {
    static let userAEmail = CollectraUITests.existingTestEmail
    static let userAPassword = CollectraUITests.existingTestPassword
    // A fresh account created via the same admin-API pattern as `userAEmail`
    // (Supabase auto-confirms `email_confirm: true`, no confirmation email
    // needed), used only for the sign-out/sign-in isolation test.
    static let userBEmail = "collectra-ios-test-userb-1786352531@mailinator.com"
    static let userBPassword = "Test-password-1234!"

    static let targetCardId = "pkmn-bw6-56"
    static let targetCardName = "Gothorita"
    static let variantAId = "cmrvlzc1514i06ar68o9ct3ve" // Reverse Holofoil
    static let variantBId = "cmrvlzbzx14hy6ar6r6h9qv3w" // Base

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    // MARK: - Sections 3 + 4: golden collection flow + multi-variant isolation

    func testGoldenPathAndMultiVariantIsolation() async throws {
        // Local, non-isolated copies: `Self.variantAId` etc are MainActor-isolated
        // static properties and can't be referenced from the @Sendable closures
        // passed to `RealBackend.pollCard` below.
        let variantAId = Self.variantAId
        let variantBId = Self.variantBId

        let token = try await RealBackend.signIn(email: Self.userAEmail, password: Self.userAPassword)
        try await RealBackend.resetCard(cardId: Self.targetCardId, variantId: variantAId, token: token)
        try await RealBackend.resetCard(cardId: Self.targetCardId, variantId: variantBId, token: token)

        let app = XCUIApplication()
        app.launch()
        try ensureSignedOut(app)
        try signIn(app, email: Self.userAEmail, password: Self.userAPassword)
        try await openTargetCard(app)

        let __v1 = await quantityLabel(app)
        XCTAssertEqual(__v1, "0", "Variant A should start unowned after reset")
        let __v2 = await enabled(app.buttons["toggle-favorite"])
        XCTAssertFalse(__v2, "Favorite must stay disabled while unowned")
        let __v3 = await enabled(app.buttons["toggle-vault"])
        XCTAssertFalse(__v3, "Vault must stay disabled while unowned")

        app.buttons["quantity-increment"].tap()
        let incremented = await waitUntil(timeout: 45) { await self.quantityLabel(app) == "1" }
        XCTAssertTrue(incremented, "Quantity did not reach 1 after a real increment round trip")
        let __v4 = await enabled(app.buttons["toggle-favorite"])
        XCTAssertTrue(__v4, "Favorite should unlock once the variant is owned")
        let __v5 = await enabled(app.buttons["toggle-vault"])
        XCTAssertTrue(__v5, "Vault should unlock once the variant is owned")

        app.buttons["toggle-favorite"].tap()
        let __wait1 = await waitUntil(timeout: 30) { await self.selected(app.buttons["toggle-favorite"]) }
        XCTAssertTrue(__wait1)

        app.buttons["toggle-vault"].tap()
        let __wait2 = await waitUntil(timeout: 30) { await self.selected(app.buttons["toggle-vault"]) }
        XCTAssertTrue(__wait2)

        app.buttons["toggle-wishlist"].tap()
        let __wait3 = await waitUntil(timeout: 30) { await self.selected(app.buttons["toggle-wishlist"]) }
        XCTAssertTrue(__wait3)

        // Shelf / Vault / Wishlist all reflect the real mutations.
        app.tabBars.buttons["Shelf"].tap()
        XCTAssertTrue(app.navigationBars["Shelf"].waitForExistence(timeout: 10))
        let shelfCell = app.buttons.matching(identifier: "shelf-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch
        XCTAssertTrue(shelfCell.waitForExistence(timeout: 30), "Card did not appear on Shelf after mutation")
        XCTAssertTrue(shelfCell.label.contains("quantity 1"), "Shelf cell did not show the correct quantity: \(shelfCell.label)")

        tapSegment(app, "Vault")
        let vaultCell = app.buttons.matching(identifier: "vault-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch
        XCTAssertTrue(vaultCell.waitForExistence(timeout: 15), "Card did not appear in Vault after vaulting")

        tapSegment(app, "Wishlist")
        let wishlistCell = app.buttons.matching(identifier: "wishlist-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch
        XCTAssertTrue(wishlistCell.waitForExistence(timeout: 15), "Card did not appear in Wishlist after wishlisting")

        // Return to Card Detail via a fresh Catalog navigation — state must still match the server.
        try await openTargetCard(app)
        let __v6 = await quantityLabel(app)
        XCTAssertEqual(__v6, "1")
        let __v7 = await selected(app.buttons["toggle-favorite"])
        XCTAssertTrue(__v7)
        let __v8 = await selected(app.buttons["toggle-vault"])
        XCTAssertTrue(__v8)
        let __v9 = await selected(app.buttons["toggle-wishlist"])
        XCTAssertTrue(__v9)

        // Independent cross-check directly against the server (not just the UI's own state).
        let afterMutations = try await RealBackend.pollCard(id: Self.targetCardId, token: token) { variants, card in
            guard let v = variants.first(where: { $0["id"] as? String == variantAId }) else { return false }
            return v["ownedQuantity"] as? Int == 1 && v["favorited"] as? Bool == true && v["vaulted"] as? Bool == true
                && (card["viewer"] as? [String: Any])?["isWishlisted"] as? Bool == true
        }
        let variantsAfter = afterMutations["variants"] as? [[String: Any]] ?? []
        let variantAAfter = variantsAfter.first(where: { $0["id"] as? String == Self.variantAId })
        XCTAssertEqual(variantAAfter?["ownedQuantity"] as? Int, 1)
        XCTAssertEqual(variantAAfter?["favorited"] as? Bool, true)
        XCTAssertEqual(variantAAfter?["vaulted"] as? Bool, true)
        XCTAssertEqual((afterMutations["viewer"] as? [String: Any])?["isWishlisted"] as? Bool, true)

        // --- Multi-variant isolation: Variant B must start independent of Variant A ---
        let variantBChip = app.buttons["variant-chip-\(Self.variantBId)"]
        XCTAssertTrue(variantBChip.waitForExistence(timeout: 10))
        variantBChip.tap()
        XCTAssertTrue(app.descendants(matching: .any)["card-detail-price-tag"].waitForExistence(timeout: 10))
        let __v10 = await quantityLabel(app)
        XCTAssertEqual(__v10, "0", "Variant B must start unowned independent of Variant A")
        let __v11 = await selected(app.buttons["toggle-favorite"])
        XCTAssertFalse(__v11, "Variant B must not inherit Variant A's favorite state")

        app.buttons["quantity-increment"].tap()
        let __wait4 = await waitUntil(timeout: 45) { await self.quantityLabel(app) == "1" }
        XCTAssertTrue(__wait4)
        app.buttons["toggle-favorite"].tap()
        let __wait5 = await waitUntil(timeout: 30) { await self.selected(app.buttons["toggle-favorite"]) }
        XCTAssertTrue(__wait5)

        // Switching back to Variant A must show it unaffected by Variant B's mutation.
        let variantAChip = app.buttons["variant-chip-\(Self.variantAId)"]
        variantAChip.tap()
        XCTAssertTrue(app.descendants(matching: .any)["card-detail-price-tag"].waitForExistence(timeout: 10))
        let __v12 = await quantityLabel(app)
        XCTAssertEqual(__v12, "1", "Variant A's quantity must not be affected by Variant B's mutation")
        let __v13 = await selected(app.buttons["toggle-favorite"])
        XCTAssertTrue(__v13, "Variant A must still be favorited")
        let __v14 = await selected(app.buttons["toggle-vault"])
        XCTAssertTrue(__v14)

        let finalCard = try await RealBackend.pollCard(id: Self.targetCardId, token: token) { variants, _ in
            let a = variants.first(where: { $0["id"] as? String == variantAId })
            let b = variants.first(where: { $0["id"] as? String == variantBId })
            return a?["ownedQuantity"] as? Int == 1 && a?["favorited"] as? Bool == true
                && b?["ownedQuantity"] as? Int == 1 && b?["favorited"] as? Bool == true
        }
        let finalVariants = finalCard["variants"] as? [[String: Any]] ?? []
        let finalA = finalVariants.first(where: { $0["id"] as? String == Self.variantAId })
        let finalB = finalVariants.first(where: { $0["id"] as? String == Self.variantBId })
        XCTAssertEqual(finalA?["ownedQuantity"] as? Int, 1, "Variant A quantity must not have been cross-contaminated by Variant B's mutation")
        XCTAssertEqual(finalA?["favorited"] as? Bool, true)
        XCTAssertEqual(finalB?["ownedQuantity"] as? Int, 1)
        XCTAssertEqual(finalB?["favorited"] as? Bool, true)

        // Decrement Variant A back down and verify the real server state.
        variantAChip.tap()
        app.buttons["quantity-decrement"].tap()
        let __wait6 = await waitUntil(timeout: 45) { await self.quantityLabel(app) == "0" }
        XCTAssertTrue(__wait6)

        let afterDecrement = try await RealBackend.getCard(id: Self.targetCardId, token: token)
        let variantAAfterDecrement = (afterDecrement["variants"] as? [[String: Any]] ?? []).first(where: { $0["id"] as? String == Self.variantAId })
        XCTAssertEqual(variantAAfterDecrement?["ownedQuantity"] as? Int, 0)
    }

    // MARK: - Section 8: app relaunch persists real server state

    func testStateSurvivesRelaunch() async throws {
        let token = try await RealBackend.signIn(email: Self.userAEmail, password: Self.userAPassword)
        try await RealBackend.resetCard(cardId: Self.targetCardId, variantId: Self.variantAId, token: token)
        try await RealBackend.setQuantity(cardId: Self.targetCardId, variantId: Self.variantAId, action: "increment", token: token)

        let app = XCUIApplication()
        app.launch()
        try ensureSignedOut(app)
        try signIn(app, email: Self.userAEmail, password: Self.userAPassword)

        app.tabBars.buttons["Shelf"].tap()
        XCTAssertTrue(app.navigationBars["Shelf"].waitForExistence(timeout: 10))
        let shelfCellBefore = app.buttons.matching(identifier: "shelf-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch
        XCTAssertTrue(shelfCellBefore.waitForExistence(timeout: 30), "Shelf did not show the card set up via direct API before relaunch")

        app.terminate()
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Home"].waitForExistence(timeout: 15), "Session was not restored after relaunch")

        app.tabBars.buttons["Shelf"].tap()
        XCTAssertTrue(app.navigationBars["Shelf"].waitForExistence(timeout: 10))
        let shelfCellAfter = app.buttons.matching(identifier: "shelf-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch
        XCTAssertTrue(shelfCellAfter.waitForExistence(timeout: 30), "Shelf did not still show the card after a full app relaunch")

        try await RealBackend.resetCard(cardId: Self.targetCardId, variantId: Self.variantAId, token: token)
    }

    // MARK: - Section 7: user isolation across sign-out/sign-in

    func testUserIsolationAcrossSignOutSignIn() async throws {
        let tokenA = try await RealBackend.signIn(email: Self.userAEmail, password: Self.userAPassword)
        try await RealBackend.resetCard(cardId: Self.targetCardId, variantId: Self.variantAId, token: tokenA)
        try await RealBackend.setQuantity(cardId: Self.targetCardId, variantId: Self.variantAId, action: "increment", token: tokenA)

        let app = XCUIApplication()
        app.launch()
        try ensureSignedOut(app)
        try signIn(app, email: Self.userAEmail, password: Self.userAPassword)

        app.tabBars.buttons["Shelf"].tap()
        XCTAssertTrue(app.navigationBars["Shelf"].waitForExistence(timeout: 10))
        let userACell = app.buttons.matching(identifier: "shelf-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch
        XCTAssertTrue(userACell.waitForExistence(timeout: 30), "User A's Shelf did not show their own card")

        try ensureSignedOut(app)
        try signIn(app, email: Self.userBEmail, password: Self.userBPassword)

        app.tabBars.buttons["Shelf"].tap()
        XCTAssertTrue(app.navigationBars["Shelf"].waitForExistence(timeout: 10))
        // User B's Shelf must never show User A's card — poll instead of a
        // single check, so we're not just catching User A's data mid-fetch.
        let userBNeverSeesUserACard = await waitUntil(timeout: 15) {
            let stillLoading = app.staticTexts["Loading your collection…"].exists
            return !stillLoading
        }
        XCTAssertTrue(userBNeverSeesUserACard, "Shelf never finished loading for User B")
        XCTAssertFalse(
            app.buttons.matching(identifier: "shelf-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch.exists,
            "User B's Shelf must not show User A's card"
        )

        tapSegment(app, "Vault")
        XCTAssertFalse(
            app.buttons.matching(identifier: "vault-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch.exists,
            "User B's Vault must not show User A's card"
        )
        tapSegment(app, "Wishlist")
        XCTAssertFalse(
            app.buttons.matching(identifier: "wishlist-card-cell").matching(NSPredicate(format: "label CONTAINS %@", Self.targetCardName)).firstMatch.exists,
            "User B's Wishlist must not show User A's card"
        )

        try ensureSignedOut(app)
        try await RealBackend.resetCard(cardId: Self.targetCardId, variantId: Self.variantAId, token: tokenA)
    }

    // MARK: - Helpers (mirroring CollectraUITests' own private helpers)

    private func waitUntil(timeout: TimeInterval, _ condition: () async -> Bool) async -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if await condition() { return true }
            try? await Task.sleep(nanoseconds: 300_000_000)
        }
        return await condition()
    }

    private func settle() async {
        try? await Task.sleep(nanoseconds: 400_000_000)
    }

    /// The quantity stepper legitimately swaps `quantity-value`'s Text for a
    /// bare ProgressView while a mutation is in flight (CollectionControlsView's
    /// `isMutatingQuantity` branch) — so during a real (10-20s+) round trip
    /// this element genuinely does not exist for a while. Reading `.label`
    /// on an element that failed its existence check crashes the whole test
    /// (XCTest treats it as a hard snapshot-resolution failure, not a
    /// catchable error), so this must check the boolean before touching the
    /// element at all and return a sentinel instead of ever reading a
    /// property off a nonexistent element.
    private func quantityLabel(_ app: XCUIApplication, timeout: TimeInterval = 3) async -> String {
        let element = app.staticTexts["quantity-value"]
        guard element.waitForExistence(timeout: timeout) else { return "" }
        await settle()
        guard element.exists else { return "" }
        return element.label
    }

    private func selected(_ element: XCUIElement, timeout: TimeInterval = 3) async -> Bool {
        guard element.waitForExistence(timeout: timeout) else { return false }
        await settle()
        guard element.exists else { return false }
        return element.isSelected
    }

    private func enabled(_ element: XCUIElement, timeout: TimeInterval = 3) async -> Bool {
        guard element.waitForExistence(timeout: timeout) else { return false }
        await settle()
        guard element.exists else { return false }
        return element.isEnabled
    }

    private func tapSegment(_ app: XCUIApplication, _ label: String) {
        let segmentButton = app.segmentedControls.buttons[label]
        if segmentButton.waitForExistence(timeout: 5) {
            segmentButton.tap()
        } else {
            app.buttons[label].tap()
        }
    }

    private func openTargetCard(_ app: XCUIApplication) async throws {
        tapTab("Catalog", in: app)
        XCTAssertTrue(app.navigationBars["Catalog"].waitForExistence(timeout: 10))

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10))
        searchField.tap()
        // Checking `.value` for "is there existing text" is unreliable here:
        // an untouched SwiftUI `.searchable` field reports its placeholder
        // string as `.value`, not "" — so this checks for the Clear button
        // itself instead.
        let clearButton = searchField.buttons["Clear text"]
        if clearButton.waitForExistence(timeout: 1) {
            clearButton.tap()
        }
        searchField.typeText(Self.targetCardName)

        let cell = app.buttons.matching(identifier: "catalog-card-cell").matching(NSPredicate(format: "label CONTAINS %@", "Dragons Exalted")).firstMatch
        XCTAssertTrue(cell.waitForExistence(timeout: 20), "Search did not surface the fixture card 'Gothorita' from Dragons Exalted")
        cell.tap()

        // This dev environment's card-detail fetch has documented latency up
        // to ~20s+ even warm (confirmed live via direct curl during this
        // verification — see the Phase 5 report), occasionally more under
        // load; 60s matches `CollectraUITests`'s own generous tolerance
        // elsewhere for this same backend's documented latency spikes.
        XCTAssertTrue(app.descendants(matching: .any)["card-detail-price-tag"].waitForExistence(timeout: 60), "Card detail did not load")
        XCTAssertTrue(app.staticTexts["quantity-value"].waitForExistence(timeout: 10), "Collection controls did not render")
        await settle()
    }

    /// Navigates to the tab named `name`, guaranteeing its `NavigationStack`
    /// is at root (navBar title == `name`) before returning.
    ///
    /// Catalog deliberately keeps whatever it last pushed (e.g. a
    /// `CardDetailView`) alive across a tab switch — that's Phase 4
    /// requirement §10, preserving search/scroll state — so simply tapping
    /// the tab bar button can reveal a stale pushed screen instead of the
    /// root list. That must be handled as one explicit "pop to root" step,
    /// not folded into a blind retry-tap loop: retapping an *already
    /// selected* tab bar button invokes the platform's own reselect-to-pop
    /// gesture, which looks identical to "the first tap didn't register"
    /// but is a different action. Conflating the two (the previous
    /// implementation here) made this helper accidentally reveal the stale
    /// screen, then pop it, then push a *second fresh* `CardDetailView` on
    /// every revisit — two full real backend fetches instead of the one
    /// this navigation actually needs, and on a flaky/nondeterministic
    /// number of tab-bar taps to boot.
    private func tapTab(_ name: String, in app: XCUIApplication) {
        let tabButton = app.tabBars.buttons[name]
        XCTAssertTrue(tabButton.waitForExistence(timeout: 5), "\(name) tab button not found")

        if !tabButton.isSelected {
            tabButton.tap()
        }

        if app.navigationBars[name].waitForExistence(timeout: 5) { return }

        // Selected (or just-selected) but not at root: pop back explicitly
        // via the default back button rather than retapping the tab bar.
        let backButton = app.navigationBars.buttons[name]
        XCTAssertTrue(backButton.waitForExistence(timeout: 5), "\(name) tab is selected but neither its root nor a back button to it was found")
        backButton.tap()
        XCTAssertTrue(app.navigationBars[name].waitForExistence(timeout: 10), "\(name) tab did not reach its root after popping")
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

    /// See `CollectraUITests`'s identical helper's doc comment.
    private func dismissOnboardingIfPresent(_ app: XCUIApplication) {
        if app.buttons["Skip"].waitForExistence(timeout: 3) {
            app.buttons["Skip"].tap()
        } else if app.buttons["Get Started"].waitForExistence(timeout: 2) {
            app.buttons["Get Started"].tap()
        }
    }

    private func signIn(_ app: XCUIApplication, email: String, password: String) throws {
        let emailField = app.textFields["signin-email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 10))
        emailField.tap()
        emailField.typeText(email)

        let passwordField = app.secureTextFields["signin-password"]
        passwordField.tap()
        passwordField.typeText(password)

        app.buttons["Sign In"].tap()
        let notNow = app.buttons["Not Now"]
        if notNow.waitForExistence(timeout: 5) {
            notNow.tap()
        }
        XCTAssertTrue(app.tabBars.buttons["Home"].waitForExistence(timeout: 20), "Sign in did not reach the authenticated shell for \(email)")
    }
}
