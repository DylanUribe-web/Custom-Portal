// Este módulo se usa si necesitas llamar a ZohoSign API directamente
// En Fase 1, preferimos el related list de CRM (crm.ts → getSignDocuments)
// Deja este archivo preparado para Fase 2

import { getZohoAccessToken } from './token'

const BASE = process.env.ZOHO_SIGN_BASE! // https://sign.zoho.com/api/v1

async function get<T = any>(path: string): Promise<T> {
  const token = await getZohoAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`ZohoSign ${res.status} → ${path}`)
  return res.json()
}

export async function getRequestsByEmail(email: string) {
  try {
    // Nota: ZohoSign no tiene filtro por recipient email en list endpoint
    // Se traen todos y se filtran — úsalo solo si el related list de CRM no cubre el caso
    const res = await get('/requests?limit=100')
    const requests = res.requests ?? []
    return requests.filter((r: any) =>
      r.actions?.some((a: any) => a.recipient_email === email)
    )
  } catch {
    return []
  }
}