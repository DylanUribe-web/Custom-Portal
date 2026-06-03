// Solo para debugging en desarrollo — no expongas esto en producción
import { getZohoAccessToken } from '@/lib/zoho/token'
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  try {
    const token = await getZohoAccessToken()
    return NextResponse.json({ ok: true, token_preview: token.slice(0, 20) + '...' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}