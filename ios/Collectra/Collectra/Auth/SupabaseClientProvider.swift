import Foundation
import Supabase

/// One shared Supabase client for the whole app — same project the web app
/// uses (AppConfig.supabaseURL/supabaseAnonKey), so signing in on iOS
/// authenticates against the identical user/session Supabase manages for
/// the web app. Session persistence is handled entirely by the SDK's
/// default Keychain-backed storage — this app never implements its own
/// token storage.
enum SupabaseClientProvider {
    static let client = SupabaseClient(
        supabaseURL: AppConfig.supabaseURL,
        supabaseKey: AppConfig.supabaseAnonKey
    )
}
