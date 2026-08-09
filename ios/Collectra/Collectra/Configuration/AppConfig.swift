import Foundation

/// Central place for anything that differs between Debug (Simulator, local
/// dev server) and Release (device/TestFlight/App Store) — never hardcode a
/// base URL anywhere else in the app. Values are injected via
/// `Configuration/{Debug,Release}.xcconfig` → Info.plist, not hardcoded here,
/// so switching environments never requires a Swift source change.
enum AppConfig {
    /// `http://localhost:3000` in Debug (Simulator only — see the Debug.xcconfig
    /// doc comment; a physical device needs the Mac's LAN IP instead, not
    /// localhost), the deployed Collectra API in Release.
    static let apiBaseURL: URL = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            let url = URL(string: raw)
        else {
            fatalError("API_BASE_URL missing/invalid in Info.plist — check Configuration/{Debug,Release}.xcconfig")
        }
        return url
    }()

    /// Same Supabase project the web app uses — auth must be shared, not a
    /// second identity system. These are the public anon key + URL (safe to
    /// ship in a client binary, same as the web app's NEXT_PUBLIC_ values;
    /// never the service-role key).
    static let supabaseURL: URL = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: raw)
        else {
            fatalError("SUPABASE_URL missing/invalid in Info.plist")
        }
        return url
    }()

    static let supabaseAnonKey: String = {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String, !key.isEmpty else {
            fatalError("SUPABASE_ANON_KEY missing in Info.plist")
        }
        return key
    }()
}
