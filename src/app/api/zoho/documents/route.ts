import { createClient } from '@/lib/supabase/server'
import { getPatientByEmail, getPatientDocuments, getSurgeryConfirmationByPatient } from '@/lib/zoho/crm'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patient = await getPatientByEmail(user.email)
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const [documents, surgeryConfirmations] = await Promise.all([
    getPatientDocuments({
      email: user.email,          // ← nuevo parámetro
      lead_id: patient.lead_id,
      contact_id: patient.contact_id,
      deal_id: patient.deal_id,
    }),
    getSurgeryConfirmationByPatient({
      lead_id: patient.lead_id,
      contact_id: patient.contact_id,
    }),
  ])

  return NextResponse.json({ documents, surgery_confirmations: surgeryConfirmations })
}