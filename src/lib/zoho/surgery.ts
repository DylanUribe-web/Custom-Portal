import { getZohoAccessToken } from './token'

// Normaliza cualquier datetime string al formato que Zoho acepta: "YYYY-MM-DDTHH:MM:SS+00:00"
function toZohoDateTime(val: string | null | undefined): string | null {
  if (!val) return null
  try {
    // Parsea la fecha — soporta ISO completo, datetime-local ("2026-05-27T15:30"), etc.
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 19) + '+00:00'
  } catch {
    return null
  }
}

const BASE = process.env.ZOHO_API_BASE!

async function get<T = any>(path: string): Promise<T> {
  const token = await getZohoAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: 'no-store',
  })
  if (res.status === 204) return { data: [] } as T
  if (!res.ok) throw new Error(`Surgery GET ${res.status} → ${path}: ${await res.text()}`)
  return res.json()
}

async function crmPut<T = any>(path: string, body: object): Promise<T> {
  const token = await getZohoAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Surgery PUT ${res.status} → ${path}: ${await res.text()}`)
  return res.json()
}

// ── Agrega este helper después de crmPut ──────────────────────────
async function crmDeleteFile(path: string): Promise<void> {
  const token = await getZohoAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: 'no-store',
  })
  const text = await res.text()
  console.log(`[Surgery] DELETE ${path} → HTTP ${res.status}:`, text.slice(0, 120))
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error(`DELETE ${res.status}: ${text}`)
  }
}

// ── Helper para obtener el file_id actual de un campo ─────────────
async function getCurrentAttachmentId(
  recordId: string,
  fieldApiName: string
): Promise<string | null> {
  try {
    const res = await get(`/Surgery/${recordId}?fields=${fieldApiName}`)
    const fieldValue = res.data?.[0]?.[fieldApiName]
    if (!fieldValue) return null

    const entry = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue
    const attachmentId = entry?.attachment_Id ?? entry?.id ?? entry?.file_id ?? null
    console.log(`[Surgery] ${fieldApiName} attachment_Id:`, attachmentId)
    return attachmentId
  } catch (e) {
    console.error(`[Surgery] getCurrentAttachmentId error:`, e)
    return null
  }
}

async function getCurrentFileUploadFieldValue(
  recordId: string,
  fieldApiName: string
): Promise<any[] | Record<string, any> | null> {
  try {
    const res = await get(`/Surgery/${recordId}?fields=${fieldApiName}`)
    const fieldValue = res.data?.[0]?.[fieldApiName]
    if (!fieldValue) return null

    const debugValue = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue
    console.log(`[Surgery] ${fieldApiName} raw field value:`, JSON.stringify(debugValue).slice(0, 400))
    return fieldValue
  } catch (e) {
    console.error(`[Surgery] getCurrentFileUploadFieldValue error:`, e)
    return null
  }
}

async function waitForFieldCleared(
  recordId: string,
  fieldApiName: string,
  timeoutMs = 15000,
  intervalMs = 1000,
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const fieldValue = await getCurrentFileUploadFieldValue(recordId, fieldApiName)
    if (!fieldValue) return true
    console.log(`[Surgery] waiting for ${fieldApiName} to clear... current value still present`)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return false
}

async function clearFileUploadField(
  recordId: string,
  fieldApiName: string,
): Promise<boolean> {
  const fieldValue = await getCurrentFileUploadFieldValue(recordId, fieldApiName)
  const attachments = Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : []
  const deletePayload = attachments
    .map((entry) => {
      const attachmentId = entry?.attachment_Id ?? entry?.id ?? entry?.file_id ?? null
      return attachmentId ? { attachment_id: attachmentId, _delete: null } : null
    })
    .filter(Boolean)

  if (deletePayload.length > 0) {
    await crmPut(`/Surgery/${recordId}`, {
      data: [{
        id: recordId,
        [fieldApiName]: deletePayload,
      }],
    })
    console.log(`[Surgery] cleared file field ${fieldApiName} with delete payload`, deletePayload)
  } else {
    const attachmentId = await getCurrentAttachmentId(recordId, fieldApiName)
    if (attachmentId) {
      await crmDeleteFile(`/Surgery/${recordId}/Attachments/${attachmentId}`)
    }

    await crmPut(`/Surgery/${recordId}`, {
      data: [{
        id: recordId,
        [fieldApiName]: [],
      }],
    })
    console.log(`[Surgery] cleared file field ${fieldApiName} with []`)
  }

  if (await waitForFieldCleared(recordId, fieldApiName)) {
    return true
  }

  console.log(`[Surgery] retry clearing ${fieldApiName} using null`)
  await crmPut(`/Surgery/${recordId}`, {
    data: [{
      id: recordId,
      [fieldApiName]: null,
    }],
  })

  return await waitForFieldCleared(recordId, fieldApiName)
}

// ─── Types ────────────────────────────────────────────────────────
export type SurgeryStatus = 'active' | 'completed' | 'cancelled' | 'inactive'

export interface SurgeryRecord {
  id: string
  name: string
  surgery_id: string
  status: SurgeryStatus
  case_status: string | null
  is_active: boolean
  surgery_date: string | null
  submission_count: number
  last_submission_date: string | null
  // Arrival
  patient_arrival_method: string | null
  // Flight — Arrival
  airline: string | null
  flight_number: string | null
  arrival_date_time: string | null
  // Flight — Departure from TJ
  airline_departure: string | null
  flight_number_departure: string | null
  departure_date_time: string | null
  // Accommodation
  location_before_surgery: string | null
  location_after_surgery: string | null
  stay_before_surgery: string | null
  stay_after_surgery: string | null
  nights_before_surgery: number | null
  nights_after_surgery: number | null
  // Transportation
  san_diego_transportation: string | null
  pickup_address: string | null
  address_line_2: string | null
  postal_zip_code: string | null
  number_of_companions: number | null
  // Companion
  companion_during_surgery: string | null
  companion_first_name: string | null
  companion_last_name: string | null
  companion_phone: string | null
  companion_email: string | null
  companion_for_medical_pass: string | null
  medical_pass: string | null
  // Info confirmation (multiselect → array)
  info_confirmation: string[]
  // Files — solo si existen (no bajamos el archivo)
  has_patient_id: boolean
  has_companion_id: boolean
  has_lab_results: boolean
  has_flight_details_arrival: boolean
  has_flight_details_departure: boolean
}

export interface SurgeryUpdatePayload {
  patient_arrival_method?: string
  airline?: string
  flight_number?: string
  arrival_date_time?: string | null
  airline_departure?: string
  flight_number_departure?: string
  departure_date_time?: string | null
  location_before_surgery?: string
  location_after_surgery?: string
  stay_before_surgery?: string
  stay_after_surgery?: string
  nights_before_surgery?: number | null
  nights_after_surgery?: number | null
  san_diego_transportation?: string
  pickup_address?: string
  address_line_2?: string
  postal_zip_code?: string
  number_of_companions?: number | null
  companion_during_surgery?: string
  companion_first_name?: string
  companion_last_name?: string
  companion_phone?: string
  companion_email?: string
  companion_for_medical_pass?: string
  medical_pass?: string
  info_confirmation?: string[]
}

// ─── Campos a pedir en el GET ─────────────────────────────────────
const FIELDS = [
  'Name', 'Surgery_ID', 'Is_Active', 'Case_Status', 'Surgery_Date',
  'Submission_Count', 'Last_Submission_Date',
  'Patient_Arrival_Method',
  'Airline', 'Flight_Number', 'Arrival_Date_Time',
  'Airline_Departure', 'Flight_Number_Departure', 'Departure_D_T_Departure_From_Tijuana',
  'Location_Before_Surgery', 'Location_After_Surgery',
  'Stay_Before_Surgery', 'Stay_After_Surgery',
  'Nights_Before_Surgery', 'Nights_After_Surgery',
  'San_Diego_Transportation',
  'Pickup_Address', 'Address_Line_2', 'Postal_Zip_Code', 'Number_of_Companions',
  'Companion_During_Surgery', 'Companion_First_Name', 'Companion_Last_Name',
  'Companion_Phone', 'Companion_Email', 'Companion_For_Medical_Pass', 'Medical_Pass',
  'Info_Confirmation',
  'Patient_ID_Photo', 'Companion_ID_Photo', 'Lab_Results',
  'Flight_Details', 'Flight_Details_Departure_From_Tijuana',
].join(',')

// ─── Mapeo de Case_Status → SurgeryStatus ─────────────────────────
function resolveStatus(r: any): SurgeryStatus {
  if (!r.Is_Active) return 'inactive'
  const cs = r.Case_Status ?? ''
  if (cs === 'Completed') return 'completed'
  if (cs === 'Cancelled') return 'cancelled'
  if (cs === 'Inactive')  return 'inactive'
  return 'active' // 'Active' o vacío
}

function mapRecord(r: any): SurgeryRecord {
  const parseConfirmation = (val: any): string[] => {
    if (!val) return []
    if (Array.isArray(val)) return val
    return String(val).split(';').map((s) => s.trim()).filter(Boolean)
  }

  return {
    id: r.id,
    name: r.Name ?? '',
    surgery_id: r.Surgery_ID ?? r.id,
    status: resolveStatus(r),
    case_status: r.Case_Status ?? null,
    is_active: r.Is_Active ?? true,
    surgery_date: r.Surgery_Date ?? null,
    submission_count: r.Submission_Count ?? 0,
    last_submission_date: r.Last_Submission_Date ?? null,
    patient_arrival_method: r.Patient_Arrival_Method ?? null,
    airline: r.Airline ?? null,
    flight_number: r.Flight_Number ?? null,
    arrival_date_time: r.Arrival_Date_Time ?? null,
    airline_departure: r.Airline_Departure ?? null,
    flight_number_departure: r.Flight_Number_Departure ?? null,
    departure_date_time: r.Departure_D_T_Departure_From_Tijuana ?? null,
    location_before_surgery: r.Location_Before_Surgery ?? null,
    location_after_surgery: r.Location_After_Surgery ?? null,
    stay_before_surgery: r.Stay_Before_Surgery ?? null,
    stay_after_surgery: r.Stay_After_Surgery ?? null,
    nights_before_surgery: r.Nights_Before_Surgery ?? null,
    nights_after_surgery: r.Nights_After_Surgery ?? null,
    san_diego_transportation: r.San_Diego_Transportation ?? null,
    pickup_address: r.Pickup_Address ?? null,
    address_line_2: r.Address_Line_2 ?? null,
    postal_zip_code: r.Postal_Zip_Code ?? null,
    number_of_companions: r.Number_of_Companions ?? null,
    companion_during_surgery: r.Companion_During_Surgery ?? null,
    companion_first_name: r.Companion_First_Name ?? null,
    companion_last_name: r.Companion_Last_Name ?? null,
    companion_phone: r.Companion_Phone ?? null,
    companion_email: r.Companion_Email ?? null,
    companion_for_medical_pass: r.Companion_For_Medical_Pass ?? null,
    medical_pass: r.Medical_Pass ?? null,
    info_confirmation: parseConfirmation(r.Info_Confirmation),
    has_patient_id: !!r.Patient_ID_Photo,
    has_companion_id: !!r.Companion_ID_Photo,
    has_lab_results: !!r.Lab_Results,
    has_flight_details_arrival: !!r.Flight_Details,
    has_flight_details_departure: !!r.Flight_Details_Departure_From_Tijuana,
  }
}

// ─── GET — busca el registro activo del paciente ──────────────────
export async function getSurgeryRecord({
  lead_id,
  contact_id,
}: {
  lead_id: string | null
  contact_id: string | null
}): Promise<SurgeryRecord | null> {
  const conditions: string[] = []
  if (contact_id) conditions.push(`(Contact_Name:equals:${contact_id})`)
  if (lead_id)    conditions.push(`(Lead_Name:equals:${lead_id})`)
  if (conditions.length === 0) return null

  const criteria = conditions.length === 1
    ? conditions[0]
    : `(${conditions.join('or')})`

  try {
    const res = await get(`/Surgery/search?criteria=${criteria}&fields=${FIELDS}`)
    const records: any[] = res.data ?? []
    if (records.length === 0) return null
    // Prioriza el activo; si no hay activo, toma el más reciente
    const active = records.find((r) => r.Is_Active === true)
    return mapRecord(active ?? records[0])
  } catch (e) {
    console.error('[Surgery] getSurgeryRecord error:', e)
    return null
  }
}

// ─── PUT — actualiza el registro, incrementa submission_count ─────
export async function updateSurgeryRecord(
  recordId: string,
  payload: SurgeryUpdatePayload,
  currentCount: number
): Promise<{ ok: boolean; error?: string }> {
  // Mapeo payload → API names de CRM
  const data: Record<string, any> = { id: recordId }

  const map: Record<keyof SurgeryUpdatePayload, string> = {
    patient_arrival_method:    'Patient_Arrival_Method',
    airline:                   'Airline',
    flight_number:             'Flight_Number',
    arrival_date_time:         'Arrival_Date_Time',
    airline_departure:         'Airline_Departure',
    flight_number_departure:   'Flight_Number_Departure',
    departure_date_time:       'Departure_D_T_Departure_From_Tijuana',
    location_before_surgery:   'Location_Before_Surgery',
    location_after_surgery:    'Location_After_Surgery',
    stay_before_surgery:       'Stay_Before_Surgery',
    stay_after_surgery:        'Stay_After_Surgery',
    nights_before_surgery:     'Nights_Before_Surgery',
    nights_after_surgery:      'Nights_After_Surgery',
    san_diego_transportation:  'San_Diego_Transportation',
    pickup_address:            'Pickup_Address',
    address_line_2:            'Address_Line_2',
    postal_zip_code:           'Postal_Zip_Code',
    number_of_companions:      'Number_of_Companions',
    companion_during_surgery:  'Companion_During_Surgery',
    companion_first_name:      'Companion_First_Name',
    companion_last_name:       'Companion_Last_Name',
    companion_phone:           'Companion_Phone',
    companion_email:           'Companion_Email',
    companion_for_medical_pass:'Companion_For_Medical_Pass',
    medical_pass:              'Medical_Pass',
    info_confirmation:         'Info_Confirmation',
  }

  // Campos DateTime — necesitan formato Zoho
  const datetimeFields = new Set([
    'Arrival_Date_Time',
    'Departure_D_T_Departure_From_Tijuana',
  ])

  for (const [key, crmKey] of Object.entries(map)) {
    const val = payload[key as keyof SurgeryUpdatePayload]
    if (val === undefined) continue

    if (crmKey === 'Info_Confirmation' && Array.isArray(val)) {
      data[crmKey] = val
    } else if (datetimeFields.has(crmKey)) {
      // Normaliza al formato que Zoho acepta
      const formatted = toZohoDateTime(val as string)
      if (formatted) data[crmKey] = formatted
      // Si es null/inválido, no lo incluimos (evita enviar basura)
    } else {
      data[crmKey] = val
    }
  }

  // Tracking — también normalizados
  data.Submission_Count     = currentCount + 1
  data.Last_Submission_Date = toZohoDateTime(new Date().toISOString())

  try {
    await crmPut(`/Surgery/${recordId}`, { data: [data] })
    return { ok: true }
  } catch (e: any) {
    console.error('[Surgery] updateSurgeryRecord error:', e)
    return { ok: false, error: e.message }
  }
}

// Campos que solo aceptan 1 archivo — hay que limpiar antes de reemplazar
const SINGLE_FILE_FIELDS = new Set([
  'Patient_ID_Photo',
  'Companion_ID_Photo',
  'Flight_Details',
  'Flight_Details_Departure_From_Tijuana',
])

export async function uploadSurgeryFile(
  recordId: string,
  fieldApiName: string,
  file: File
): Promise<{ ok: boolean; error?: string }> {
  const token = await getZohoAccessToken()

  // ── Paso 0: borra el archivo existente en campos single-file ─────
  if (SINGLE_FILE_FIELDS.has(fieldApiName)) {
    const cleared = await clearFileUploadField(recordId, fieldApiName)
    if (!cleared) {
      const message = `Field ${fieldApiName} was not cleared before upload`;
      console.error(`[Surgery] ${message}`)
      return { ok: false, error: message }
    }
  }
    
  // ── Paso 1: sube al content server ────────────────────────────
  const uploadForm = new FormData()
  uploadForm.append('file', file, file.name)

  const uploadRes = await fetch(`${BASE}/files`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    body: uploadForm,
  })

  const uploadText = await uploadRes.text()
  console.log(`[Surgery] content upload HTTP ${uploadRes.status}:`, uploadText.slice(0, 200))

  if (!uploadRes.ok) {
    return { ok: false, error: `Content upload HTTP ${uploadRes.status}: ${uploadText}` }
  }

  let uploadData: any
  try {
    uploadData = JSON.parse(uploadText)
  } catch {
    return { ok: false, error: `Bad JSON: ${uploadText}` }
  }

  const fileId: string | undefined = uploadData.data?.[0]?.details?.id
  if (!fileId) {
    return { ok: false, error: `No file_id: ${uploadText}` }
  }

  console.log(`[Surgery] file_id=${fileId.slice(0, 20)}..., linking to ${fieldApiName}`)

  // ── Paso 2: actualiza el campo con el nuevo file_id ───────────
  try {
    await crmPut(`/Surgery/${recordId}`, {
      data: [{ id: recordId, [fieldApiName]: [{ file_id: fileId }] }],
    })
    console.log(`[Surgery] ${fieldApiName} updated OK`)
    return { ok: true }
  } catch (e: any) {
    console.error(`[Surgery] step 2 error (${fieldApiName}):`, e.message)
    return { ok: false, error: e.message }
  }
}