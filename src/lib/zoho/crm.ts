import { getZohoAccessToken } from './token'

const BASE = process.env.ZOHO_API_BASE! // https://www.zohoapis.com/crm/v3

// ─── Helper interno ───────────────────────────────────────────────
async function get<T = any>(path: string): Promise<T> {
  const token = await getZohoAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: 'no-store',
  })

  if (res.status === 204) return { data: [] } as T // No content
  if (!res.ok) throw new Error(`CRM ${res.status} → ${path}: ${await res.text()}`)
  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────
export type PatientType = 'lead' | 'contact'

export interface PatientProfile {
  type: PatientType
  lead_id: string | null
  contact_id: string | null
  deal_id: string | null
  first_name: string
  last_name: string
  email: string
  mobile: string
  // Procedimientos (Lead = interés inicial, Deal = plan final)
  procedures: string[]
  surgery_plan: string | null     // Del Deal
  // Proceso
  lead_stage: string | null
  deal_stage: string | null       // Deal: Deal Review | Surgery Scheduled | Closed Won | Closed Lost
  converted: boolean
  // Médico / logística
  surgery_date: string | null
  surgeon: string | null
  coordinator: string | null
  // Marca (Lead → Company1 | Deal → Account_Name)
  brand: string | null
  // Financiero
  amount: number | null
}

export interface ZohoSignDocument {
  id: string
  document_name: string
  status: string           // 'sent' | 'viewed' | 'signed' | 'completed' | 'declined'
  sent_date: string | null
  completed_date: string | null
  recipient_email: string
}

// ─── Helpers de búsqueda ──────────────────────────────────────────
async function searchModule(module: string, email: string) {
  try {
    const criteria = `(Email:equals:${encodeURIComponent(email)})`
    const res = await get(`/${module}/search?criteria=${criteria}`)
    return res.data ?? []
  } catch {
    return []
  }
}

async function getDealByContactId(contactId: string) {
  try {
    const res = await get(
      `/Contacts/${contactId}/Deals?fields=id,Stage,Surgery_Date,Surgery_Plan,Account_Name,Surgeon,Amount,Owner,Created_Time`
    )
    const deals: any[] = res.data ?? []
    return deals.sort((a, b) =>
      new Date(b.Created_Time).getTime() - new Date(a.Created_Time).getTime()
    )[0] ?? null
  } catch {
    return null
  }
}

// ─── Función principal ────────────────────────────────────────────
export async function getPatientByEmail(email: string): Promise<PatientProfile | null> {

  // ── 1. Busca primero en Contacts (paciente recurrente o lead convertido) ──
  const contacts = await searchModule('Contacts', email)

  if (contacts.length > 0) {
    const c = contacts[0]
    const deal = await getDealByContactId(c.id)

    return {
      type: 'contact',
      lead_id: null,
      contact_id: c.id,
      deal_id: deal?.id ?? null,
      first_name: c.First_Name ?? '',
      last_name: c.Last_Name ?? '',
      email: c.Email ?? email,
      mobile: c.Mobile ?? c.Phone ?? '',
      procedures: [],
      surgery_plan: deal?.Surgery_Plan ?? null,
      lead_stage: null,
      deal_stage: deal?.Stage ?? null,
      converted: true,
      surgery_date: deal?.Surgery_Date ?? null,
      surgeon: deal?.Surgeon ?? null,
      coordinator: deal?.Owner?.name ?? null,
      brand: deal?.Account_Name ?? null,
      amount: deal?.Amount ?? null,
    }
  }

  // ── 2. Busca en Leads ─────────────────────────────────────────────────────
  const leads = await searchModule('Leads', email)
  if (leads.length === 0) return null

  const lead = leads[0]

  const procedures = [
    lead.Procedure_Primary,
    lead.Procedures_Secondary,
    lead.Secondary_Procedures,
  ].filter(Boolean)

  // Lead convertido pero Contact no encontrado aún por timing — intento por ID
  if (lead.Converted) {
    const contactRes = await searchModule('Contacts', email)
    const contact = contactRes[0] ?? null
    const deal = contact ? await getDealByContactId(contact.id) : null

    return {
      type: 'contact',
      lead_id: lead.id,
      contact_id: contact?.id ?? null,
      deal_id: deal?.id ?? null,
      first_name: lead.First_Name ?? '',
      last_name: lead.Last_Name ?? '',
      email: lead.Email ?? email,
      mobile: lead.Mobile ?? '',
      procedures,
      surgery_plan: deal?.Surgery_Plan ?? null,
      lead_stage: null,
      deal_stage: deal?.Stage ?? null,
      converted: true,
      surgery_date: deal?.Surgery_Date ?? null,
      surgeon: deal?.Surgeon ?? null,
      coordinator: deal?.Owner?.name ?? null,
      brand: deal?.Account_Name ?? null,
      amount: deal?.Amount ?? null,
    }
  }

  // Lead activo — todavía en proceso de venta
  return {
    type: 'lead',
    lead_id: lead.id,
    contact_id: null,
    deal_id: null,
    first_name: lead.First_Name ?? '',
    last_name: lead.Last_Name ?? '',
    email: lead.Email ?? email,
    mobile: lead.Mobile ?? '',
    procedures,
    surgery_plan: null,
    lead_stage: lead.Lead_Status ?? null,
    deal_stage: null,
    converted: false,
    surgery_date: null,
    surgeon: lead.Surgeon ?? null,
    coordinator: lead.Owner?.name ?? null,
    brand: lead.Company1 ?? null,
    amount: null,
  }
}

// ─── Documentos ZohoSign desde CRM ───────────────────────────────
// El módulo zohosign__ZohoSign_Documents es una related list del Lead/Contact
export async function getSignDocuments(
  module: 'Leads' | 'Contacts',
  recordId: string
): Promise<ZohoSignDocument[]> {
  try {
    const res = await get(`/${module}/${recordId}/zohosign__ZohoSign_Documents`)
    const docs: any[] = res.data ?? []

    return docs.map((d) => ({
      id: d.id,
      document_name: d.zohosign__Document_Name ?? d.Name ?? 'Documento',
      status: d.zohosign__Document_Status ?? 'unknown',
      sent_date: d.zohosign__Sent_Date ?? null,
      completed_date: d.zohosign__Completed_Date ?? null,
      recipient_email: d.zohosign__Recipient_Email ?? '',
    }))
  } catch {
    return []
  }
}

// ─── Surgery Confirmation (checklist de docs internos) ───────────
export async function getSurgeryConfirmation(
  module: 'Leads' | 'Contacts',
  recordId: string
) {
  try {
    const res = await get(`/${module}/${recordId}/Surgery`)
    return res.data ?? []
  } catch {
    return []
  }
}

// ─── Types de documentos ──────────────────────────────────────────
export interface ZohoSignDoc {
  id: string
  name: string
  status: 'Signed' | 'Out for Signature' | 'Drafted' | 'Recalled' | 'Expired' | string
  sent_date: string | null
  completed_date: string | null
  declined_date: string | null
  deadline: string | null
  sent_from_module: string | null  // zohosign__Module_Name
  owner: string | null
  surgery_confirmation_id: string | null  // Flight_ID_PC_Details_Module
}

export interface SurgeryConfirmationDoc {
  id: string
  name: string
  status: string
  related_lead: string | null
  related_contact: string | null
}

// ─── Documentos por email vía módulo Recipients (estrategia principal) ────
async function getDocumentsByRecipientEmail(email: string): Promise<ZohoSignDoc[]> {
  try {
    const res = await get(
      `/zohosign__ZohoSign_Recipients/search?criteria=(Email:equals:${encodeURIComponent(email)})&fields=zohosign__ZohoSign_Document,zohosign__Recipient_Status,Email`
    )
    const recipients: any[] = res.data ?? []
    if (recipients.length === 0) return []

    // Extrae IDs únicos de documentos
    const docIds = [...new Set(
      recipients
        .map((r) => r.zohosign__ZohoSign_Document?.id)
        .filter(Boolean)
    )]

    // Jala detalles completos de cada documento
    const docPromises = docIds.map((id) =>
      get(`/zohosign__ZohoSign_Documents/${id}?fields=Name,Owner,zohosign__Document_Status,zohosign__Date_Sent,zohosign__Date_Completed,zohosign__Date_Declined,zohosign__Document_Deadline,zohosign__Module_Name,Flight_ID_PC_Details_Module`)
        .then((r) => r.data ? mapDocRecord(r.data[0] ?? r.data) : null)
        .catch(() => null)
    )

    return (await Promise.all(docPromises)).filter(Boolean) as ZohoSignDoc[]
  } catch (e) {
    console.error('[CRM] getDocumentsByRecipientEmail error:', e)
    return []
  }
}

// ─── Documentos por IDs conocidos (fallback — cubre docs creados desde CRM) ─
async function getDocumentsByKnownIds({
  lead_id,
  contact_id,
  deal_id,
}: {
  lead_id: string | null
  contact_id: string | null
  deal_id: string | null
}): Promise<ZohoSignDoc[]> {
  const conditions: string[] = []
  if (lead_id)    conditions.push(`(zohosign__Lead:equals:${lead_id})`)
  if (contact_id) conditions.push(`(zohosign__Contact:equals:${contact_id})`)
  if (deal_id)    conditions.push(`(zohosign__Deal:equals:${deal_id})`)
  if (conditions.length === 0) return []

  const criteria = conditions.length === 1
    ? conditions[0]
    : `(${conditions.join('or')})`

  const fields = [
    'Name', 'Owner', 'zohosign__Document_Status',
    'zohosign__Date_Sent', 'zohosign__Date_Completed',
    'zohosign__Date_Declined', 'zohosign__Document_Deadline',
    'zohosign__Module_Name', 'Flight_ID_PC_Details_Module',
  ].join(',')

  try {
    const res = await get(
      `/zohosign__ZohoSign_Documents/search?criteria=${criteria}&fields=${fields}`
    )
    return (res.data ?? []).map(mapDocRecord)
  } catch {
    return []
  }
}

// ─── Mapper común ─────────────────────────────────────────────────
function mapDocRecord(d: any): ZohoSignDoc {
  return {
    id: d.id,
    name: d.Name ?? 'Documento',
    status: d.zohosign__Document_Status ?? 'Drafted',
    sent_date: d.zohosign__Date_Sent ?? null,
    completed_date: d.zohosign__Date_Completed ?? null,
    declined_date: d.zohosign__Date_Declined ?? null,
    deadline: d.zohosign__Document_Deadline ?? null,
    sent_from_module: d.zohosign__Module_Name ?? null,
    owner: d.Owner?.name ?? null,
    surgery_confirmation_id: d.Flight_ID_PC_Details_Module?.id ?? null,
  }
}

// ─── Función principal exportada ──────────────────────────────────
export async function getPatientDocuments({
  email,
  lead_id,
  contact_id,
  deal_id,
}: {
  email: string
  lead_id: string | null
  contact_id: string | null
  deal_id: string | null
}): Promise<ZohoSignDoc[]> {
  // Corre ambas estrategias en paralelo
  const [byEmail, byIds] = await Promise.all([
    getDocumentsByRecipientEmail(email),
    getDocumentsByKnownIds({ lead_id, contact_id, deal_id }),
  ])

  // Merge y deduplica por ID de documento
  const seen = new Set<string>()
  return [...byEmail, ...byIds].filter((doc) => {
    if (seen.has(doc.id)) return false
    seen.add(doc.id)
    return true
  })
}

// ─── Surgery Confirmation (formulario de vuelos/logística) ────────
export async function getSurgeryConfirmationByPatient({
  lead_id,
  contact_id,
}: {
  lead_id: string | null
  contact_id: string | null
}): Promise<SurgeryConfirmationDoc[]> {
  const conditions: string[] = []
  if (lead_id)    conditions.push(`(Lead_Name:equals:${lead_id})`)
  if (contact_id) conditions.push(`(Contact_Name:equals:${contact_id})`)

  if (conditions.length === 0) return []

  const criteria = conditions.length === 1
    ? conditions[0]
    : `(${conditions.join('or')})`

  try {
    const res = await get(`/Surgery/search?criteria=${criteria}&fields=Name,Status,Lead_Name,Contact_Name`)
    const records: any[] = res.data ?? []

    return records.map((r) => ({
      id: r.id,
      name: r.Name ?? 'Surgery Confirmation',
      status: r.Status ?? '',
      related_lead: r.Lead_Name?.name ?? null,
      related_contact: r.Contact_Name?.name ?? null,
    }))
  } catch {
    return []
  }
}