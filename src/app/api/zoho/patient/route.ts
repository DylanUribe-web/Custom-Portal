import { createClient } from '@/lib/supabase/server'
import { getPatientByEmail, getSignDocuments, getSurgeryConfirmation, ZohoSignDocument } from '@/lib/zoho/crm'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patient = await getPatientByEmail(user.email)

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found in CRM' }, { status: 404 })
  }

  let signDocs: ZohoSignDocument[] = []
  let surgeryConfirmation: any[] = []

  if (patient.type === 'contact' && patient.contact_id) {
    signDocs = await getSignDocuments('Contacts', patient.contact_id)
    surgeryConfirmation = await getSurgeryConfirmation('Contacts', patient.contact_id)
  } else if (patient.lead_id) {
    signDocs = await getSignDocuments('Leads', patient.lead_id)
    surgeryConfirmation = await getSurgeryConfirmation('Leads', patient.lead_id)
  }

  return NextResponse.json({
    patient,
    sign_documents: signDocs,
    surgery_confirmation: surgeryConfirmation,
  })
}