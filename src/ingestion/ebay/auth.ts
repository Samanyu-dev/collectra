// eBay OAuth client-credentials grant (Application access token) — the
// Browse API's "search" and "getItem" methods only need this app-level
// token, not a per-user token (see developer.ebay.com/develop/api/buy/browse_api:
// "All methods in the Browse API require an Application access token,
// which is obtained using the client credentials grant flow").
//
// Confirmed live end-to-end against real Production credentials before this
// module was written (a raw curl against this exact endpoint/grant/scope
// returned a real access_token) — this module formalizes that, with caching
// and refresh.

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SCOPE = "https://api.ebay.com/oauth/api_scope";

let cachedToken: string | null = null;
let cachedExpiresAt = 0; // epoch ms

export async function getApplicationToken(): Promise<string> {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error("EBAY_APP_ID / EBAY_CERT_ID are not set — see .env.local");
  }

  // 60s safety margin so a token doesn't expire mid-request.
  if (cachedToken && Date.now() < cachedExpiresAt - 60_000) {
    return cachedToken;
  }

  const basic = Buffer.from(`${appId}:${certId}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: SCOPE }).toString(),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`eBay OAuth token request failed: HTTP ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number; token_type: string };
  cachedToken = data.access_token;
  cachedExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}
