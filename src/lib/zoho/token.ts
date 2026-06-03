// Cache en memoria del proceso Node.js — sobrevive múltiples requests en prod
interface TokenCache {
  access_token: string
  expires_at: number // ms timestamp
}

let cache: TokenCache | null = null

export async function getZohoAccessToken(): Promise<string> {
  const now = Date.now()

  // Reutiliza si le quedan más de 5 minutos de vida
  if (cache && cache.expires_at - now > 5 * 60 * 1000) {
    return cache.access_token
  }

  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    grant_type: 'refresh_token',
  })

  const res = await fetch(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Zoho token refresh HTTP ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()

  if (!data.access_token) {
    throw new Error(`Zoho no devolvió access_token: ${JSON.stringify(data)}`)
  }

  cache = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ?? 3600) * 1000,
  }

  return cache.access_token
}