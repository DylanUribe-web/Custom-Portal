import { createClient } from '@/lib/supabase/server'
import { getPatientByEmail, getSignDocuments, getSurgeryConfirmation, getPatientQuotes } from '@/lib/zoho/crm'
import type { ZohoSignDocument } from '@/lib/zoho/crm'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientByEmail(user.email)
  if (!patient) return NextResponse.json({ error: 'Patient not found in CRM' }, { status: 404 })

  let signDocs: ZohoSignDocument[] = []
  let surgeryConfirmation: any[] = []

  if (patient.contact_id) {
    signDocs = await getSignDocuments('Contacts', patient.contact_id)
    surgeryConfirmation = await getSurgeryConfirmation('Contacts', patient.contact_id)
  }
  if (patient.lead_id && signDocs.length === 0) {
    signDocs = await getSignDocuments('Leads', patient.lead_id)
    surgeryConfirmation = await getSurgeryConfirmation('Leads', patient.lead_id)
  }

  const quotes = await getPatientQuotes({
    lead_id: patient.lead_id,
    contact_id: patient.contact_id,
  })

  return NextResponse.json({ patient, sign_documents: signDocs, surgery_confirmation: surgeryConfirmation, quotes })
} 