'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { SurgeryRecord, SurgeryUpdatePayload } from '@/lib/zoho/surgery'

// ── Picklist values — actualiza con los valores exactos de CRM ────
const ARRIVAL_METHODS = ['✈️ By Plane', '🚗 By Car', '🏨 Already in San Diego', 'Other']
// Hoteles primero → para Stay Before Surgery
const STAY_BEFORE_OPTIONS = [
  'Marriott Tijuana (Hotel)',
  'Hotel Lucerna (Hotel)',
  'Real Inn Tijuana (Hotel)',
  'City Express Plus (Hotel)',
  'Hotel Quartz (Hotel)',
  'Baja Premium (Recovery house)',
  'Cocoon Recovery (Recovery house)',
  'Palmas Recovery (Recovery house)',
  'Casa by Linda (Recovery house)',
  'Bella (Recovery house)',
  'None',
  'Other',
]
// Recovery houses primero → para Stay After Surgery
const STAY_AFTER_OPTIONS = [
  'Baja Premium (Recovery house)',
  'Cocoon Recovery (Recovery house)',
  'Palmas Recovery (Recovery house)',
  'Casa by Linda (Recovery house)',
  'Bella (Recovery house)',
  'Marriott Tijuana (Hotel)',
  'Hotel Lucerna (Hotel)',
  'Real Inn Tijuana (Hotel)',
  'City Express Plus (Hotel)',
  'Hotel Quartz (Hotel)',
  'None',
  'Other',
]
const TRANSPORTATION_OPTIONS = ['Yes', 'No', 'Not Confirmed Yet']
const COMPANION_OPTIONS      = ['Yes', 'No', 'Not Confirmed Yet']
const MEDICAL_PASS_OPTIONS   = ['Yes', 'No', 'Not Needed']
const INFO_CONFIRMATIONS = [
  'I confirm all information is correct',
  'I understand recovery house is not included',
]

type FormState = Omit<SurgeryUpdatePayload, 'info_confirmation'> & {
  info_confirmation: string[]
}

export default function ItineraryPage() {
  const [surgery, setSurgery]     = useState<SurgeryRecord | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [form, setForm]           = useState<FormState>({ info_confirmation: [] })
  const [saving, setSaving]       = useState(false)
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null)
  const [stayBeforeOther, setStayBeforeOther] = useState(
    surgery?.stay_before_surgery && !STAY_BEFORE_OPTIONS.includes(surgery.stay_before_surgery)
        ? surgery.stay_before_surgery : ''
    )
  const [stayAfterOther, setStayAfterOther] = useState(
    surgery?.stay_after_surgery && !STAY_AFTER_OPTIONS.includes(surgery.stay_after_surgery)
        ? surgery.stay_after_surgery : ''
    )
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [justReplaced, setJustReplaced] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/zoho/surgery')
      .then((r) => {
        if (!r.ok) throw new Error('Your surgery information was not found. Please contact your coordinator.')
        return r.json()
      })
      .then(({ surgery: s }) => {
        setSurgery(s)
        // Pre-popula el form con los datos existentes
        setForm({
          patient_arrival_method:   s.patient_arrival_method ?? undefined,
          airline:                  s.airline ?? undefined,
          flight_number:            s.flight_number ?? undefined,
          arrival_date_time:        s.arrival_date_time ?? undefined,
          airline_departure:        s.airline_departure ?? undefined,
          flight_number_departure:  s.flight_number_departure ?? undefined,
          departure_date_time:      s.departure_date_time ?? undefined,
          location_before_surgery:  s.location_before_surgery ?? undefined,
          location_after_surgery:   s.location_after_surgery ?? undefined,
          stay_before_surgery:      s.stay_before_surgery ?? undefined,
          stay_after_surgery:       s.stay_after_surgery ?? undefined,
          nights_before_surgery:    s.nights_before_surgery ?? undefined,
          nights_after_surgery:     s.nights_after_surgery ?? undefined,
          san_diego_transportation: s.san_diego_transportation ?? undefined,
          pickup_address:           s.pickup_address ?? undefined,
          address_line_2:           s.address_line_2 ?? undefined,
          postal_zip_code:          s.postal_zip_code ?? undefined,
          number_of_companions:     s.number_of_companions ?? undefined,
          companion_during_surgery: s.companion_during_surgery ?? undefined,
          companion_first_name:     s.companion_first_name ?? undefined,
          companion_last_name:      s.companion_last_name ?? undefined,
          companion_phone:          s.companion_phone ?? undefined,
          companion_email:          s.companion_email ?? undefined,
          companion_for_medical_pass: s.companion_for_medical_pass ?? undefined,
          medical_pass:             s.medical_pass ?? undefined,
          info_confirmation:        s.info_confirmation ?? [],
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const set = useCallback((key: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleConfirmation = (val: string) => {
    setForm((prev) => {
      const current = prev.info_confirmation ?? []
      return {
        ...prev,
        info_confirmation: current.includes(val)
          ? current.filter((v) => v !== val)
          : [...current, val],
      }
    })
  }

  async function handleSave() {
    if (!surgery) return
    setSaving(true)
    setSaveResult(null)

    const res = await fetch('/api/zoho/surgery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)
    setSaveResult(res.ok ? 'success' : 'error')
    if (res.ok) {
      setSurgery((prev) => prev
        ? { ...prev, submission_count: prev.submission_count + 1, last_submission_date: new Date().toISOString() }
        : prev
      )
    }
    // Clear result message after 4s
    setTimeout(() => setSaveResult(null), 4000)
  }

  async function handleFileUpload(fieldKey: string, file: File) {
    setUploadingField(fieldKey)
    const wasReplacing = surgery ? (
      fieldKey === 'patient_id' && surgery.has_patient_id ||
      fieldKey === 'companion_id' && surgery.has_companion_id ||
      fieldKey === 'lab_results' && surgery.has_lab_results ||
      fieldKey === 'flight_arrival' && surgery.has_flight_details_arrival ||
      fieldKey === 'flight_departure' && surgery.has_flight_details_departure
    ) : false
    
    const fd = new FormData()
    fd.append('field', fieldKey)
    fd.append('file', file)
    const res = await fetch('/api/zoho/surgery/files', { method: 'POST', body: fd })
    setUploadingField(null)
    
    if (res.ok) {
      // Guarda el nombre del archivo
      setFileNames(prev => ({ ...prev, [fieldKey]: file.name }))
      
      // Marca que fue reemplazado
      if (wasReplacing) {
        setJustReplaced(prev => ({ ...prev, [fieldKey]: true }))
        setTimeout(() => {
          setJustReplaced(prev => ({ ...prev, [fieldKey]: false }))
        }, 3000)
      }
      
      // Marca el archivo como subido
      setSurgery((prev) => {
        if (!prev) return prev
        const update: Partial<SurgeryRecord> = {}
        if (fieldKey === 'patient_id')       update.has_patient_id = true
        if (fieldKey === 'companion_id')     update.has_companion_id = true
        if (fieldKey === 'lab_results')      update.has_lab_results = true
        if (fieldKey === 'flight_arrival')   update.has_flight_details_arrival = true
        if (fieldKey === 'flight_departure') update.has_flight_details_departure = true
        return { ...prev, ...update }
      })
    }
  }

  if (loading)  return <PageSkeleton />
  if (error)    return <ErrorState message={error} />
  if (!surgery) return null

  const isByPlane   = form.patient_arrival_method === '✈️ By Plane'
  const hasCompanion = form.companion_during_surgery === 'Yes'
  const isReadOnly  = surgery.status === 'completed' || surgery.status === 'cancelled'

  // ── Calcular estado de secciones visibles ──
  const sectionStates = calculateSectionStates(form, surgery, isByPlane, hasCompanion)
  const visibleBadges = getVisibleBadges(isByPlane, hasCompanion)
  const progressPercent = calculateProgressPercent(sectionStates)

  return (
    <div className="itin-page">

      {/* Header */}
      <div className="itin-header">
        <div>
          <h1 className="itin-title">Itinerario & Confirmación</h1>
          <p className="itin-subtitle">
            Complete and update your travel and recovery information.
            You can return to this page at any time.
          </p>
        </div>
        {surgery.last_submission_date && (
          <div className="last-saved">
            <span className="last-saved-icon">✓</span>
            Last updated: {formatDate(surgery.last_submission_date)}
          </div>
        )}
      </div>

      {/* Banner de estado */}
      {surgery.status === 'completed' && (
        <div className="status-banner status-banner--completed">
          <span>✓</span>
          <p>Your surgery process has been completed. This information is read-only.</p>
        </div>
      )}
      {surgery.status === 'cancelled' && (
        <div className="status-banner status-banner--cancelled">
          <span>✕</span>
          <p>Your process was cancelled. Please contact your coordinator for more information.</p>
        </div>
      )}

      {/* Progress chips */}
      <div className="progress-chips">
        {visibleBadges.map(badge => {
          const state = sectionStates[badge.key]
          return (
            <ProgressChip 
              key={badge.key}
              label={badge.label}
              state={state}
            />
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="progress-bar-container">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="progress-bar-text">{progressPercent}% completado</span>
      </div>

      {/* ── SECCIÓN 1: Método de llegada ── */}
      <FormSection title="How will you arrive?" emoji="🚦">
        <RadioGroup
          name="arrival_method"
          options={ARRIVAL_METHODS}
          value={form.patient_arrival_method ?? ''}
          onChange={(v) => set('patient_arrival_method', v)}
          disabled={isReadOnly}
        />
      </FormSection>

      {/* ── SECCIÓN 2: Vuelo — Llegada a Tijuana ── */}
      {isByPlane && (
        <FormSection title="Flight — Arrival in Tijuana 🛬">
          <div className="form-grid-2">
            <TextInput label="Airline" value={form.airline ?? ''} onChange={(v) => set('airline', v)} disabled={isReadOnly} />
            <TextInput label="Flight Number" value={form.flight_number ?? ''} onChange={(v) => set('flight_number', v)} disabled={isReadOnly} />
          </div>
          <div className="form-grid-2">
            <DateTimeInput label="Arrival Date and Time" value={form.arrival_date_time ?? ''} onChange={(v) => set('arrival_date_time', v)} disabled={isReadOnly} />
          </div>
          <FileUploadField
            label="Flight Itinerary (Arrival)"
            fieldKey="flight_arrival"
            hasFile={surgery.has_flight_details_arrival}
            fileName={fileNames['flight_arrival']}
            justReplaced={justReplaced['flight_arrival']}
            onUpload={handleFileUpload}
            uploading={uploadingField === 'flight_arrival'}
            disabled={isReadOnly}
          />
        </FormSection>
      )}

      {/* ── SECCIÓN 3: Vuelo — Salida de Tijuana ── */}
      {isByPlane && (
        <FormSection title="Flight — Departure from Tijuana 🛫">
          <div className="form-grid-2">
            <TextInput label="Airline (Departure)" value={form.airline_departure ?? ''} onChange={(v) => set('airline_departure', v)} disabled={isReadOnly} />
            <TextInput label="Flight Number (Departure)" value={form.flight_number_departure ?? ''} onChange={(v) => set('flight_number_departure', v)} disabled={isReadOnly} />
          </div>
          <div className="form-grid-2">
            <DateTimeInput label="Departure Date and Time" value={form.departure_date_time ?? ''} onChange={(v) => set('departure_date_time', v)} disabled={isReadOnly} />
          </div>
          <FileUploadField
            label="Flight Itinerary (Departure)"
            fieldKey="flight_departure"
            hasFile={surgery.has_flight_details_departure}
            fileName={fileNames['flight_departure']}
            justReplaced={justReplaced['flight_departure']}
            onUpload={handleFileUpload}
            uploading={uploadingField === 'flight_departure'}
            disabled={isReadOnly}
          />
        </FormSection>
      )}

      {/* ── SECCIÓN 4: Hospedaje ── */}
      <FormSection title="Lodging 🏨">
        <div className="form-grid-2">
            <div className="field-wrapper">
            <label>Accommodation before surgery</label>
            <SelectInput
                options={STAY_BEFORE_OPTIONS}
                value={STAY_BEFORE_OPTIONS.includes(form.stay_before_surgery ?? '')
                ? (form.stay_before_surgery ?? '')
                : (form.stay_before_surgery ? 'Other' : '')}
                onChange={(v) => {
                set('stay_before_surgery', v === 'Other' ? '' : v)
                if (v !== 'Other') setStayBeforeOther('')
                }}
                disabled={isReadOnly}
            />
            {(form.stay_before_surgery === '' && stayBeforeOther !== undefined) ||
            (form.stay_before_surgery && !STAY_BEFORE_OPTIONS.slice(0,-1).includes(form.stay_before_surgery)) ? (
                <input
                type="text"
                className="field-input"
                placeholder="Specify accommodation..."
                value={stayBeforeOther}
                disabled={isReadOnly}
                onChange={(e) => {
                    setStayBeforeOther(e.target.value)
                    set('stay_before_surgery', e.target.value)
                }}
                />
            ) : null}
            </div>
            <NumberInput
            label="Nights before surgery"
            value={form.nights_before_surgery ?? ''}
            onChange={(v) => set('nights_before_surgery', v ? Number(v) : null)}
            disabled={isReadOnly}
            />
        </div>

        <TextInput
            label="Name / Address (before surgery)"
            value={form.location_before_surgery ?? ''}
            onChange={(v) => set('location_before_surgery', v)}
            disabled={isReadOnly}
        />

        <div className="form-grid-2">
            <div className="field-wrapper">
            <label>Accommodation after surgery</label>
            <SelectInput
                options={STAY_AFTER_OPTIONS}
                value={STAY_AFTER_OPTIONS.includes(form.stay_after_surgery ?? '')
                ? (form.stay_after_surgery ?? '')
                : (form.stay_after_surgery ? 'Other' : '')}
                onChange={(v) => {
                set('stay_after_surgery', v === 'Other' ? '' : v)
                if (v !== 'Other') setStayAfterOther('')
                }}
                disabled={isReadOnly}
            />
            {(form.stay_after_surgery === '' && stayAfterOther !== undefined) ||
            (form.stay_after_surgery && !STAY_AFTER_OPTIONS.slice(0,-1).includes(form.stay_after_surgery)) ? (
                <input
                type="text"
                className="field-input"
                placeholder="Specify accommodation..."
                value={stayAfterOther}
                disabled={isReadOnly}
                onChange={(e) => {
                    setStayAfterOther(e.target.value)
                    set('stay_after_surgery', e.target.value)
                }}
                />
            ) : null}
            </div>
            <NumberInput
            label="Nights after surgery"
            value={form.nights_after_surgery ?? ''}
            onChange={(v) => set('nights_after_surgery', v ? Number(v) : null)}
            disabled={isReadOnly}
            />
        </div>

        <TextInput
            label="Name / Address (after surgery)"
            value={form.location_after_surgery ?? ''}
            onChange={(v) => set('location_after_surgery', v)}
            disabled={isReadOnly}
        />
      </FormSection>

      {/* ── SECCIÓN 5: Transporte ── */}
      <FormSection title="Transportation & Pickup 🚐">
        <div className="field-wrapper">
            <label>Do you need transportation from San Diego?</label>
            <RadioGroup
            name="sdtransport"
            options={TRANSPORTATION_OPTIONS}
            value={form.san_diego_transportation ?? ''}
            onChange={(v) => set('san_diego_transportation', v)}
            disabled={isReadOnly}
            />
        </div>

        {form.san_diego_transportation === 'Yes' && (
            <>
            <div className="transport-note">
                <span>ℹ</span>
                <p>The CER team will contact you to coordinate the pickup. Please provide your pickup address:</p>
            </div>
            <div className="form-grid-2">
                <TextInput label="Pickup Address" value={form.pickup_address ?? ''} onChange={(v) => set('pickup_address', v)} disabled={isReadOnly} />
                <TextInput label="Address Line 2" value={form.address_line_2 ?? ''} onChange={(v) => set('address_line_2', v)} disabled={isReadOnly} />
            </div>
            <div className="form-grid-2">
                <TextInput label="Postal Code" value={form.postal_zip_code ?? ''} onChange={(v) => set('postal_zip_code', v)} disabled={isReadOnly} />
                <NumberInput label="Number of Companions on Pickup" value={form.number_of_companions ?? ''} onChange={(v) => set('number_of_companions', v ? Number(v) : null)} disabled={isReadOnly} />
            </div>
            </>
        )}
      </FormSection>

      {/* ── SECCIÓN 6: Labs ── */}
      <FormSection title="Laboratory Results 🧪">
        <p className="section-note">
          Upload your results as a photo (JPG/PNG) or PDF. They must be from the last 3 months.        </p>
        <FileUploadField
          label="Upload Laboratory Results"
          fieldKey="lab_results"
          hasFile={surgery.has_lab_results}
          fileName={fileNames['lab_results']}
          justReplaced={justReplaced['lab_results']}
          onUpload={handleFileUpload}
          uploading={uploadingField === 'lab_results'}
          disabled={isReadOnly}
        />
      </FormSection>

      {/* ── SECCIÓN 7: Acompañante ── */}
      <FormSection title="Companion Information 👤">
        <div className="field-wrapper">
          <label>Will you have a companion during the surgery?</label>
          <RadioGroup
            name="companion"
            options={COMPANION_OPTIONS}
            value={form.companion_during_surgery ?? ''}
            onChange={(v) => set('companion_during_surgery', v)}
            disabled={isReadOnly}
          />
        </div>

        {hasCompanion && (
          <>
            <div className="form-grid-2">
              <TextInput label="First Name" value={form.companion_first_name ?? ''} onChange={(v) => set('companion_first_name', v)} disabled={isReadOnly} />
              <TextInput label="Last Name" value={form.companion_last_name ?? ''} onChange={(v) => set('companion_last_name', v)} disabled={isReadOnly} />
            </div>
            <div className="form-grid-2">
              <TextInput label="Phone" value={form.companion_phone ?? ''} onChange={(v) => set('companion_phone', v)} disabled={isReadOnly} />
              <TextInput label="Email" value={form.companion_email ?? ''} onChange={(v) => set('companion_email', v)} disabled={isReadOnly} />
            </div>
            <div className="form-grid-2">
              <div className="field-wrapper">
                <label>Medical Pass</label>
                <SelectInput options={MEDICAL_PASS_OPTIONS} value={form.medical_pass ?? ''} onChange={(v) => set('medical_pass', v)} disabled={isReadOnly} />
              </div>
              <div className="field-wrapper">
                <label>1 Companion (Medical Pass)</label>
                <SelectInput options={COMPANION_OPTIONS} value={form.companion_for_medical_pass ?? ''} onChange={(v) => set('companion_for_medical_pass', v)} disabled={isReadOnly} />
              </div>
            </div>
          </>
        )}
      </FormSection>

      {/* ── SECCIÓN 8: Documentos (IDs) ── */}
      <FormSection title="Documents — Identifications 🪪">
        <div className="form-grid-2">
          <FileUploadField
            label="Patient ID"
            fieldKey="patient_id"
            hasFile={surgery.has_patient_id}
            fileName={fileNames['patient_id']}
            justReplaced={justReplaced['patient_id']}
            onUpload={handleFileUpload}
            uploading={uploadingField === 'patient_id'}
            disabled={isReadOnly}
          />
          {hasCompanion && (
            <FileUploadField
              label="Companion ID"
              fieldKey="companion_id"
              hasFile={surgery.has_companion_id}
              fileName={fileNames['companion_id']}
              justReplaced={justReplaced['companion_id']}
              onUpload={handleFileUpload}
              uploading={uploadingField === 'companion_id'}
              disabled={isReadOnly}
            />
          )}
        </div>
      </FormSection>

      {/* ── SECCIÓN 9: Confirmación ── */}
      {!isReadOnly && (
        <FormSection title="Confirmation ✅">
          <div className="confirmation-checks">
            {INFO_CONFIRMATIONS.map((item) => (
              <label key={item} className="check-label">
                <input
                  type="checkbox"
                  className="check-input"
                  checked={form.info_confirmation.includes(item)}
                  onChange={() => toggleConfirmation(item)}
                />
                <span className="check-text">{item}</span>
              </label>
            ))}
          </div>
        </FormSection>
      )}

      {/* ── Botón guardar ── */}
      {!isReadOnly && (
        <div className="save-bar">
          {saveResult === 'success' && (
            <span className="save-msg save-msg--ok">✓ Information saved correctly</span>
          )}
          {saveResult === 'error' && (
            <span className="save-msg save-msg--err">⚠ Error saving information. Please try again.</span>
          )}
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner-sm" /> Saving...</> : 'Save Information'}
          </button>
        </div>
      )}

      <style>{itinStyles}</style>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────
function FormSection({ title, emoji, children }: {
  title: string; emoji?: string; children: React.ReactNode
}) {
  return (
    <section className="form-section">
      <h2 className="form-section-title">{title}</h2>
      <div className="form-section-body">{children}</div>
    </section>
  )
}

function TextInput({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <div className="field-wrapper">
      <label>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field-input" />
    </div>
  )
}

function NumberInput({ label, value, onChange, disabled }: {
  label: string; value: string | number; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <div className="field-wrapper">
      <label>{label}</label>
      <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field-input" />
    </div>
  )
}

function DateTimeInput({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleClick = () => {
    if (disabled) return
    inputRef.current?.showPicker?.()
  }

  return (
    <div className="field-wrapper">
      <label>{label}</label>
      <input
        ref={inputRef}
        type="datetime-local"
        lang="en-US"
        value={value ? value.slice(0, 16) : ''}
        onChange={(e) => onChange(e.target.value)}
        onClick={handleClick}
        disabled={disabled}
        className="field-input"
      />
    </div>
  )
}

function SelectInput({ options, value, onChange, disabled }: {
  options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="field-input field-select">
      <option value="">— Select —</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function RadioGroup({ name, options, value, onChange, disabled }: {
  name: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <div className="radio-group">
      {options.map((opt) => (
        <label key={opt} className={`radio-label ${value === opt ? 'radio-label--active' : ''}`}>
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} disabled={disabled} className="radio-input" />
          {opt}
        </label>
      ))}
    </div>
  )
}

function FileUploadField({ label, fieldKey, hasFile, fileName, justReplaced, onUpload, uploading, disabled }: {
  label: string
  fieldKey: string
  hasFile: boolean
  fileName?: string
  justReplaced?: boolean
  onUpload: (key: string, file: File) => Promise<void>
  uploading: boolean
  disabled?: boolean
}) {
  return (
    <div className="field-wrapper">
      <label>{label}</label>
      <div className={`file-zone ${hasFile ? 'file-zone--done' : ''}`}>
        {hasFile ? (
          <div className={`file-done ${justReplaced ? 'file-done--replaced' : ''}`}>
            <span className="file-done-icon">✓</span>
            <div className="file-done-content">
              <span className="file-done-name">{fileName || 'File received'}</span>
              {justReplaced && <span className="file-replaced-badge">Reemplazado</span>}
            </div>
            {!disabled && (
              <label className="file-replace-btn">
                Replace
                <input type="file" className="file-hidden" onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onUpload(fieldKey, f)
                  e.target.value = ''
                }} />
              </label>
            )}
          </div>
        ) : uploading ? (
          <div className="file-uploading">
            <span className="spinner-sm" /> Uploading...
          </div>
        ) : (
          <label className="file-upload-label">
            <span className="file-upload-icon">↑</span>
            <span>Select File</span>
            <input type="file" className="file-hidden" disabled={disabled} onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(fieldKey, f)
              e.target.value = ''
            }} />
          </label>
        )}
      </div>
    </div>
  )
}

function ProgressChip({ label, state }: { label: string; state: 'complete' | 'partial' | 'empty' | 'hidden' }) {
  if (state === 'hidden') return null
  
  const getIcon = () => {
    if (state === 'complete') return '✓'
    if (state === 'partial') return '◐'
    return '○'
  }
  
  return (
    <div className={`prog-chip prog-chip--${state}`}>
      <span>{getIcon()}</span>
      {label}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="itin-page">
      <div className="skeleton skeleton--title" />
      {[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton--section" />)}
      <style>{itinStyles}</style>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="itin-page">
      <div className="error-state">⚠ {message}</div>
      <style>{itinStyles}</style>
    </div>
  )
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Funciones de cálculo de progreso ─────────────────────────────
type SectionState = 'complete' | 'partial' | 'empty' | 'hidden'

interface VisibleBadge {
  key: string
  label: string
}

function calculateSectionStates(
  form: FormState,
  surgery: SurgeryRecord,
  isByPlane: boolean,
  hasCompanion: boolean
): Record<string, SectionState> {
  const states: Record<string, SectionState> = {}

  // Patient ID - siempre visible
  states['patient_id'] = surgery.has_patient_id ? 'complete' : 'empty'

  // Labs - siempre visible
  states['labs'] = surgery.has_lab_results ? 'complete' : 'empty'

  // Arrival Flight - solo visible si es by plane
  if (!isByPlane) {
    states['arrival_flight'] = 'hidden'
  } else {
    const hasFile = surgery.has_flight_details_arrival
    const filled = !!(form.airline && form.flight_number && form.arrival_date_time)
    states['arrival_flight'] = hasFile ? 'complete' : (filled ? 'partial' : 'empty')
  }

  // Departure Flight - solo visible si es by plane
  if (!isByPlane) {
    states['departure_flight'] = 'hidden'
  } else {
    const hasFile = surgery.has_flight_details_departure
    const filled = !!(form.airline_departure && form.flight_number_departure && form.departure_date_time)
    states['departure_flight'] = hasFile ? 'complete' : (filled ? 'partial' : 'empty')
  }

  // Companion ID - solo visible si hay companion
  if (!hasCompanion) {
    states['companion_id'] = 'hidden'
  } else {
    states['companion_id'] = surgery.has_companion_id ? 'complete' : 'empty'
  }

  return states
}

function getVisibleBadges(isByPlane: boolean, hasCompanion: boolean): VisibleBadge[] {
  const badges: VisibleBadge[] = [
    { key: 'patient_id', label: 'Patient ID' },
    { key: 'labs', label: 'Labs' },
  ]

  if (isByPlane) {
    badges.push(
      { key: 'arrival_flight', label: 'Arrival Flight' },
      { key: 'departure_flight', label: 'Departure Flight' }
    )
  }

  if (hasCompanion) {
    badges.push({ key: 'companion_id', label: 'Companion ID' })
  }

  return badges
}

function calculateProgressPercent(sectionStates: Record<string, SectionState>): number {
  const states = Object.values(sectionStates).filter(s => s !== 'hidden')
  if (states.length === 0) return 0

  const complete = states.filter(s => s === 'complete').length
  const partial = states.filter(s => s === 'partial').length

  return Math.round(((complete + partial * 0.5) / states.length) * 100)
}

// ─── Styles ───────────────────────────────────────────────────────
const itinStyles = `
  .itin-page {
    max-width: 860px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    padding-bottom: 80px;
  }

  .itin-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
  }

  .itin-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 30px;
    font-weight: 600;
    color: white;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }

  .itin-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.4);
    margin: 0;
    max-width: 520px;
    line-height: 1.6;
  }

  .last-saved {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(74,222,128,0.7);
    background: rgba(74,222,128,0.06);
    border: 1px solid rgba(74,222,128,0.12);
    border-radius: 8px;
    padding: 8px 14px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .last-saved-icon { font-size: 14px; }

  /* Status banners */
  .status-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 10px;
    font-size: 13px;
    margin-bottom: 20px;
    border: 1px solid;
  }
  .status-banner p { margin: 0; }
  .status-banner span { font-size: 18px; flex-shrink: 0; }

  .status-banner--completed {
    background: rgba(74,222,128,0.06);
    border-color: rgba(74,222,128,0.15);
    color: rgba(74,222,128,0.8);
  }
  .status-banner--cancelled {
    background: rgba(248,113,113,0.06);
    border-color: rgba(248,113,113,0.15);
    color: rgba(248,113,113,0.8);
  }

  /* Progress chips */
  .progress-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  .prog-chip {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    border-radius: 20px;
    padding: 6px 14px;
    transition: all 0.2s;
  }

  .prog-chip--empty {
    color: rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
  }

  .prog-chip--partial {
    color: #f97316;
    background: rgba(249,115,22,0.06);
    border: 1px solid rgba(249,115,22,0.15);
  }

  .prog-chip--complete {
    color: #4ade80;
    background: rgba(74,222,128,0.06);
    border: 1px solid rgba(74,222,128,0.15);
  }

  .prog-chip--hidden {
    display: none;
  }

  /* Progress bar */
  .progress-bar-container {
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progress-bar-track {
    flex: 1;
    height: 6px;
    background: rgba(255,255,255,0.06);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #0c63df, #00c4cc);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .progress-bar-text {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    min-width: 80px;
    text-align: right;
  }

  /* Form sections */
  .form-section {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .form-section-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 15px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    margin: 0;
    padding: 18px 22px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
  }

  .form-section-body {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-note {
    font-size: 13px;
    color: rgba(255,255,255,0.35);
    margin: 0;
    line-height: 1.5;
  }

  /* Grid */
  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  /* Field */
  .field-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-wrapper label {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .field-input {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 10px 14px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .field-input:focus { border-color: rgba(0,196,204,0.4); }
  .field-input:disabled { opacity: 0.4; cursor: not-allowed; }
  .field-select { background: rgb(26, 35, 54); color: white; cursor: pointer; }
  .field-input::placeholder { color: rgba(255,255,255,0.2); }

  /* Native date/time picker icon */
  .field-input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(1) brightness(1.4);
  }
  .field-input[type="datetime-local"]::-webkit-datetime-edit,
  .field-input[type="datetime-local"]::-webkit-datetime-edit-fields-wrapper {
    color: white;
  }
  .field-input[type="datetime-local"]::-moz-calendar-picker-indicator {
    filter: invert(1) brightness(1.4);
  }
  .field-input[type="datetime-local"] {
    cursor: pointer;
  }

  /* Radio group */
  .radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .radio-input { display: none; }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;
  }

  .radio-label:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }

  .radio-label--active {
    background: rgba(0,47,125,0.3);
    border-color: rgba(0,196,204,0.3);
    color: white;
  }

  /* File upload */
  .file-zone {
    border: 1px dashed rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 18px;
    text-align: center;
    transition: border-color 0.2s;
  }

  .file-zone--done {
    border-style: solid;
    border-color: rgba(74,222,128,0.2);
    background: rgba(74,222,128,0.04);
  }

  .file-done {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 13px;
    color: #4ade80;
  }

  .file-done-icon { 
    font-size: 16px; 
    flex-shrink: 0;
  }

  .file-done-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .file-done-name {
    font-size: 13px;
    color: #4ade80;
    word-break: break-all;
    max-width: 300px;
  }

  .file-replaced-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 600;
    color: #f97316;
    background: rgba(249,115,22,0.2);
    border: 1px solid rgba(249,115,22,0.3);
    border-radius: 12px;
    padding: 3px 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    animation: pulse-orange 2s ease-in-out;
  }

  @keyframes pulse-orange {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .file-replace-btn, .file-upload-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .file-replace-btn:hover, .file-upload-label:hover {
    border-color: rgba(0,196,204,0.3);
    color: rgba(255,255,255,0.8);
  }

  .file-upload-label { flex-direction: column; gap: 6px; padding: 16px; width: 100%; justify-content: center; box-sizing: border-box; }
  .file-upload-icon { font-size: 20px; color: rgba(255,255,255,0.3); }
  .file-uploading { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.4); }
  .file-hidden { display: none; }

  /* Confirmación */
  .confirmation-checks {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .check-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-size: 14px;
    color: rgba(255,255,255,0.7);
  }

  .check-input {
    width: 18px;
    height: 18px;
    accent-color: #00c4cc;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* Save bar */
  .save-bar {
    position: fixed;
    bottom: 0; left: 240px; right: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    padding: 16px 40px;
    background: rgba(6,15,36,0.95);
    border-top: 1px solid rgba(255,255,255,0.07);
    backdrop-filter: blur(10px);
    z-index: 50;
  }

  .save-msg {
    font-size: 13px;
    padding: 8px 14px;
    border-radius: 8px;
  }

  .save-msg--ok  { color: #4ade80; background: rgba(74,222,128,0.08); }
  .save-msg--err { color: #f87171; background: rgba(248,113,113,0.08); }

  .save-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #002f7d, #0043b0);
    border: 1px solid rgba(0,196,204,0.2);
    border-radius: 10px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    font-size: 14px;
    font-weight: 500;
    padding: 12px 24px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-btn:hover:not(:disabled) {
    border-color: rgba(0,196,204,0.4);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0,47,125,0.4);
  }

  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Spinner */
  .spinner-sm {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #00c4cc;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Skeletons */
  .skeleton {
    background: rgba(255,255,255,0.05);
    border-radius: 14px;
    animation: pulse 1.5s ease-in-out infinite;
    margin-bottom: 16px;
  }
  .skeleton--title   { height: 40px; width: 280px; }
  .skeleton--section { height: 180px; }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }

  .error-state {
    background: rgba(255,100,100,0.05);
    border: 1px solid rgba(255,100,100,0.15);
    border-radius: 12px;
    padding: 24px;
    color: rgba(255,255,255,0.5);
    font-size: 14px;
  }

  .transport-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: rgba(0,196,204,0.7);
    background: rgba(0,196,204,0.05);
    border: 1px solid rgba(0,196,204,0.1);
    border-radius: 8px;
    padding: 12px 16px;
  }
  .transport-note p { margin: 0; line-height: 1.5; }
  .transport-note span { flex-shrink: 0; font-size: 16px; }

  @media (max-width: 768px) {
    .save-bar { left: 0; padding: 14px 20px; }
    .form-grid-2 { grid-template-columns: 1fr; }
  }

  @media (max-width: 480px) {
    .radio-group { flex-direction: column; }
  }
`