import { createClient } from '@/lib/supabase/server'
import { getPatientByEmail } from '@/lib/zoho/crm'
import { getSurgeryRecord, updateSurgeryRecord, type SurgeryUpdatePayload } from '@/lib/zoho/surgery'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET — lee el Surgery record activo ──────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientByEmail(user.email)
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  const surgery = await getSurgeryRecord({
    lead_id: patient.lead_id,
    contact_id: patient.contact_id,
  })

  if (!surgery) return NextResponse.json({ error: 'No surgery record found' }, { status: 404 })

  return NextResponse.json({ surgery })
}

// ─── PATCH — actualiza el Surgery record ─────────────────────────
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientByEmail(user.email)
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  // Re-lee el registro para tener el ID y submission_count actuales
  const surgery = await getSurgeryRecord({
    lead_id: patient.lead_id,
    contact_id: patient.contact_id,
  })

  if (!surgery) return NextResponse.json({ error: 'No surgery record found' }, { status: 404 })

  // Bloquea actualización si el caso está cerrado
  if (surgery.status === 'completed' || surgery.status === 'cancelled') {
    return NextResponse.json({ error: 'Surgery record is closed' }, { status: 403 })
  }

  const payload: SurgeryUpdatePayload = await request.json()
  const result = await updateSurgeryRecord(surgery.id, payload, surgery.submission_count)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}