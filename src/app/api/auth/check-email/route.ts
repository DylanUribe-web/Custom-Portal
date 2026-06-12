import { getPatientByEmail } from '@/lib/zoho/crm'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body  = await request.json().catch(() => ({}))
    const email = (body.email ?? '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: 'email_required' }, { status: 400 })
    }

    const patient = await getPatientByEmail(email)
    console.log('[CheckEmail]', email, patient ? `found (${patient.type})` : 'not found')

    if (!patient) {
      return NextResponse.json({ error: 'not_registered' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[CheckEmail] error:', e.message)
    return NextResponse.json({ error: 'server_error', detail: e.message }, { status: 500 })
  }
}