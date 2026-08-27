import XCTest

/// Phase 6C/6D — runs against the REAL running Collectra backend (local dev
/// server + real Supabase), same convention as CollectraUITests/
/// Phase5CollectionUITests. Reuses the existing test account rather than
/// creating a new one (this account hasn't scanned before, so it starts
/// comfortably within the free weekly quota).
///
/// Simulator has no camera hardware at all, so the one deterministic
/// end state reachable here — once quota and permission both clear — is
/// `.cameraUnavailable` (CameraService.start() throws CameraError.deviceUnavailable,
/// see its own doc comment). That is a REAL app state, not a test-only stub;
/// asserting on it is legitimate coverage of the permission → camera-start
/// pipeline, just not of real capture, which needs a physical device.
final class ScanUITests: XCTestCase {
    static let email = CollectraUITests.existingTestEmail
    static let password = CollectraUITests.existingTestPassword

    private var interruptionMonitor: NSObjectProtocol?

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
        if let interruptionMonitor {
            removeUIInterruptionMonitor(interruptionMonitor)
        }
    }

    func testScanTabReachesADeterministicStateWithoutCrashing() throws {
        let app = XCUIApplication()

        // The system camera-permission alert is out-of-process — auto-accept
        // it if it appears, same pattern Apple's own docs recommend for
        // XCUITest. A `tap()` on the app is needed after registering to force
        // XCUITest to actually poll for the interruption.
        interruptionMonitor = addUIInterruptionMonitor(withDescription: "Camera Permission") { alert in
            let allow = alert.buttons["OK"].exists ? alert.buttons["OK"] : alert.buttons["Allow"]
            if allow.exists {
                allow.tap()
                return true
            }
            return false
        }

        app.launch()
        try ensureSignedOut(app)
        try signIn(app)

        XCTAssertTrue(app.tabBars.buttons["Scan"].waitForExistence(timeout: 15))
        tapTab("Scan", in: app)
        app.tap() // nudge XCUITest to service the interruption monitor if the permission alert is showing

        let cameraUnavailable = app.otherElements["scan-camera-unavailable-view"]
        let quotaBlocked = app.otherElements["scan-quota-blocked-view"]
        let permissionDenied = app.otherElements["scan-permission-denied-view"]
        let cameraReady = app.buttons["scan-capture-button"]

        // A manual poll rather than expectation(for:evaluatedWith:) — that
        // legacy predicate-expectation API doesn't satisfy Swift 6 strict
        // concurrency's Sendable requirements here.
        let deadline = Date().addingTimeInterval(20)
        while Date() < deadline {
            // Querying .exists services any pending UI interruption monitor
            // (e.g. the camera permission alert) — no extra taps needed here.
            if cameraUnavailable.exists || quotaBlocked.exists || permissionDenied.exists || cameraReady.exists { break }
            Thread.sleep(forTimeInterval: 0.5)
        }

        XCTAssertTrue(
            cameraUnavailable.exists || quotaBlocked.exists || permissionDenied.exists || cameraReady.exists,
            "Scan screen did not reach any recognized state — got an unhandled screen instead. Hierarchy:\n\(app.debugDescription)"
        )

        // In this Simulator environment (no camera hardware), the expected
        // real outcome is specifically .cameraUnavailable. Assert it
        // directly rather than only the generic "some known state" check
        // above, so a regression that silently stops reaching this state
        // (e.g. quota/permission logic accidentally short-circuiting) fails
        // loudly instead of passing on a different, unintended state.
        XCTAssertTrue(cameraUnavailable.waitForExistence(timeout: 5), "Expected .cameraUnavailable in a Simulator with no camera hardware")

        // Retry button ("Try Again") is the cancel/back-equivalent for this
        // state — confirms the screen doesn't dead-end.
        XCTAssertTrue(app.buttons["scan-retry-button"].exists)
    }

    func testCancelFromCameraStateReturnsToAResetScreen() throws {
        // Only meaningful if the environment actually reaches .ready, which
        // Simulator's lack of camera hardware normally prevents — included
        // for completeness/documentation of intended behavior on a real
        // device, but expected to be skipped here rather than fail.
        let app = XCUIApplication()
        interruptionMonitor = addUIInterruptionMonitor(withDescription: "Camera Permission") { alert in
            let allow = alert.buttons["OK"].exists ? alert.buttons["OK"] : alert.buttons["Allow"]
            if allow.exists { allow.tap(); return true }
            return false
        }

        app.launch()
        try ensureSignedOut(app)
        try signIn(app)
        tapTab("Scan", in: app)
        app.tap()

        let cancelButton = app.buttons["scan-cancel-button"]
        guard cancelButton.waitForExistence(timeout: 10) else {
            throw XCTSkip("Camera never reached .ready in this environment (expected without physical camera hardware) — nothing to verify cancel against.")
        }

        cancelButton.tap()
        XCTAssertTrue(app.otherElements["scan-cancelled-view"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["scan-retry-button"].exists)
    }

    // MARK: - Shared helpers (duplicated from CollectraUITests/Phase5CollectionUITests by this codebase's own convention — each UI test file is self-contained)

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

    private func tapTab(_ name: String, in app: XCUIApplication) {
        for attempt in 1...5 {
            app.tabBars.buttons[name].tap()
            if app.navigationBars[name].waitForExistence(timeout: 5) { return }
            // Scan has no navigation bar (full-bleed camera UI) — a settle-and-recheck is enough.
            if name == "Scan" { Thread.sleep(forTimeInterval: 1); return }
            if attempt < 5 { Thread.sleep(forTimeInterval: 0.5) }
        }
    }

    private func signIn(_ app: XCUIApplication) throws {
        let emailField = app.textFields["signin-email"]
        if emailField.waitForExistence(timeout: 10) {
            emailField.tap()
            emailField.typeText(Self.email)

            let passwordField = app.secureTextFields["signin-password"]
            passwordField.tap()
            passwordField.typeText(Self.password)

            app.buttons["Sign In"].tap()
            // See `CollectraUITests.dismissSavePasswordPromptIfPresent`'s doc
            // comment — the system "Save Password?" sheet sits on top of the
            // app and swallows subsequent taps (e.g. the Scan tab) until
            // dismissed. Missing here was the actual cause of this test
            // landing on a stale screen instead of ever reaching Scan.
            let notNow = app.buttons["Not Now"]
            if notNow.waitForExistence(timeout: 5) {
                notNow.tap()
            }
        }
    }
}
