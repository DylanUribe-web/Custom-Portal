import { createClient } from '@/lib/supabase/server'
import { getPatientByEmail } from '@/lib/zoho/crm'
import { getSurgeryRecord, uploadSurgeryFile } from '@/lib/zoho/surgery'
import { NextRequest, NextResponse } from 'next/server'

// Campo → API name del campo File Upload en Surgery
const ALLOWED_FIELDS: Record<string, string> = {
  patient_id:           'Patient_ID_Photo',
  companion_id:         'Companion_ID_Photo',
  lab_results:          'Lab_Results',
  flight_arrival:       'Flight_Details',
  flight_departure:     'Flight_Details_Departure_From_Tijuana',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientByEmail(user.email)
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  const surgery = await getSurgeryRecord({
    lead_id: patient.lead_id,
    contact_id: patient.contact_id,
  })
  if (!surgery) return NextResponse.json({ error: 'No surgery record' }, { status: 404 })
  if (surgery.status === 'completed' || surgery.status === 'cancelled') {
    return NextResponse.json({ error: 'Record is closed' }, { status: 403 })
  }

  const formData = await request.formData()
  const fieldKey  = formData.get('field') as string
  const file      = formData.get('file') as File | null

  if (!fieldKey || !ALLOWED_FIELDS[fieldKey]) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const result = await uploadSurgeryFile(surgery.id, ALLOWED_FIELDS[fieldKey], file)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}