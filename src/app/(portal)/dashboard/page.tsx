'use client'

import { useEffect, useState } from 'react'
import type { PatientProfile } from '@/lib/zoho/crm'
import type { PatientQuote } from '@/lib/zoho/crm'

// ─── Stages visibles al paciente ─────────────────────────────────
const STAGES = [
  { key: 'contact',   label: 'Primer contacto', icon: '◈' },
  { key: 'quote',     label: 'Cotización',       icon: '◻' },
  { key: 'review',    label: 'En revisión',      icon: '◷' },
  { key: 'confirmed', label: 'Confirmado',       icon: '◆' },
  { key: 'scheduled', label: 'Agendado',         icon: '◎' },
  { key: 'surgery',   label: 'Cirugía',          icon: '✦' },
]

interface DashboardData {
  patient: PatientProfile
  quotes: PatientQuote[]
}

export default function DashboardPage() {
  const [data, setData]           = useState<DashboardData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/zoho/patient')
      .then((r) => { if (!r.ok) throw new Error('No se pudo cargar tu información'); return r.json() })
      .then((d) => setData({ patient: d.patient, quotes: d.quotes ?? [] }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />
  if (error)   return <ErrorState msg={error} />
  if (!data)   return null

  const { patient, quotes } = data
  const latestQuote = quotes[0] ?? null
  const olderQuotes = quotes.slice(1)
  const stageIdx    = getStageIndex(patient.lead_stage, patient.deal_stage, patient.deal_id, patient.surgery_date, latestQuote)
  const pStatus     = getPatientStatus(patient.lead_stage, patient.deal_stage, patient.converted)
  const daysLeft    = getDaysUntil(patient.surgery_date)

  return (
    <div className="dash">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Hola, {patient.first_name}</h1>
          <p className="dash-subtitle">
            {patient.surgery_date ? 'Aquí está el resumen de tu proceso con CER.' : 'Tu coordinadora está preparando tu plan.'}
          </p>
        </div>
        {patient.surgery_date && (
          <div className="date-chip">{formatDate(patient.surgery_date)}</div>
        )}
      </div>

      {/* Status banners */}
      {pStatus === 'paused' && (
        <div className="banner banner--paused">⏸ Tu proceso está en pausa. Tu coordinadora se pondrá en contacto pronto.</div>
      )}
      {pStatus === 'inactive' && (
        <div className="banner banner--info">ℹ Para reactivar tu consulta, contacta a nuestro equipo.</div>
      )}
      {pStatus === 'closed_lost' && (
        <div className="banner banner--info">ℹ Tu expediente está cerrado. Contáctanos para retomar el proceso.</div>
      )}

      {/* Countdown */}
      {daysLeft !== null && patient.surgery_date && (
        <div className="countdown-card">
          <div className="countdown-inner">
            <div>
              <p className="countdown-label">Días para tu cirugía</p>
              <p className="countdown-num">{daysLeft}</p>
              <p className="countdown-sub">{daysLeft === 0 ? '¡Es hoy!' : daysLeft === 1 ? 'mañana' : 'días restantes'}</p>
            </div>
            <div className="countdown-bar-wrap">
              <div className="countdown-bar">
                <div className="countdown-fill" style={{ width: `${Math.max(5, 100 - (daysLeft / 90) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="info-grid">
        {patient.surgeon && (
          <div className="info-card">
            <p className="info-eyebrow">Tu cirujano</p>
            <div className="info-avatar">{initials(patient.surgeon)}</div>
            <p className="info-name">{patient.surgeon}</p>
          </div>
        )}
        {patient.coordinator && (
          <div className="info-card">
            <p className="info-eyebrow">Tu coordinadora</p>
            <div className="info-avatar info-avatar--coord">{initials(patient.coordinator)}</div>
            <p className="info-name">{patient.coordinator}</p>
          </div>
        )}
        {patient.brand && (
          <div className="info-card info-card--brand">
            <p className="info-eyebrow">Programa</p>
            <p className="info-name">{patient.brand}</p>
          </div>
        )}
      </div>

      {/* ── Stage Tracker (clickable) ── */}
      <div className="stage-section">
        <h2 className="section-title">Tu proceso</h2>
        <div className="stepper">
          {STAGES.map((s, i) => {
            const state = i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'pending'
            const isOpen = activeStage === i
            const clickable = i <= stageIdx  // stages pasadas y actual son revisitables
            return (
              <div key={s.key} className="step-wrap">
                <button
                  className={`step step--${state} ${clickable ? 'step--clickable' : ''}`}
                  onClick={() => clickable && setActiveStage(isOpen ? null : i)}
                  disabled={!clickable}
                >
                  <div className="step-circle">{state === 'done' ? '✓' : s.icon}</div>
                  <span className="step-label">{s.label}</span>
                  {clickable && <span className="step-chevron">{isOpen ? '▲' : '▼'}</span>}
                  {i < STAGES.length - 1 && (
                    <div className={`step-line step-line--${state === 'done' ? 'done' : 'pending'}`} />
                  )}
                </button>

                {/* Panel expandible por stage */}
                {isOpen && (
                  <div className="stage-panel">
                    {i === 0 && <StageContact patient={patient} />}
                    {i === 1 && <StageQuote latestQuote={latestQuote} olderQuotes={olderQuotes} />}
                    {i === 2 && <StageReview />}
                    {i === 3 && <StageConfirmed patient={patient} />}
                    {i === 4 && <StageScheduled patient={patient} />}
                    {i === 5 && <StageSurgery patient={patient} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Secciones de información estática / semi-dinámica ── */}
      <SurgeryIncludes />
      <PaymentOptions />
      {patient.surgery_date && <ItinerarySection patient={patient} />}
      <RecoveryPlan patient={patient} latestQuote={latestQuote} />
      <Recommendations />

      <style>{dashStyles}</style>
    </div>
  )
}

// ─── Stage panels ─────────────────────────────────────────────────
function StageContact({ patient }: { patient: PatientProfile }) {
  return (
    <div className="panel-content">
      <p>Hemos recibido tu consulta. Tu coordinadora, <strong>{patient.coordinator ?? 'nuestro equipo'}</strong>, se ha puesto en contacto contigo para conocer tus objetivos y responderte cualquier pregunta.</p>
      {patient.procedures.length > 0 && (
        <div className="proc-list">
          <p className="proc-title">Procedimientos de interés:</p>
          {patient.procedures.map((p, i) => <span key={i} className="proc-tag">{p}</span>)}
        </div>
      )}
    </div>
  )
}

function StageQuote({ latestQuote, olderQuotes }: { latestQuote: PatientQuote | null; olderQuotes: PatientQuote[] }) {
  const [showOlder, setShowOlder] = useState(false)

  if (!latestQuote) return (
    <div className="panel-content"><p className="panel-muted">Tu coordinadora está preparando tu cotización personalizada.</p></div>
  )

  return (
    <div className="panel-content">
      <QuoteCard quote={latestQuote} isLatest />
      {olderQuotes.length > 0 && (
        <>
          <button className="show-more-btn" onClick={() => setShowOlder(!showOlder)}>
            {showOlder ? '▲ Ocultar versiones anteriores' : `▼ Ver ${olderQuotes.length} versión${olderQuotes.length > 1 ? 'es' : ''} anterior${olderQuotes.length > 1 ? 'es' : ''}`}
          </button>
          {showOlder && olderQuotes.map((q) => <QuoteCard key={q.id} quote={q} />)}
        </>
      )}
    </div>
  )
}

function QuoteCard({ quote, isLatest }: { quote: PatientQuote; isLatest?: boolean }) {
  return (
    <div className={`quote-card ${isLatest ? 'quote-card--latest' : 'quote-card--older'}`}>
      <div className="quote-card-header">
        <span className="quote-subject">{quote.subject}</span>
        <span className={`quote-stage-badge stage-${quote.quote_stage.toLowerCase().replace(/\s+/g, '-')}`}>
          {quote.quote_stage}
        </span>
      </div>

      {quote.surgical_plan && (
        <p className="quote-plan">Plan quirúrgico: <strong>{quote.surgical_plan}</strong></p>
      )}
      {quote.surgical_plan_2nd && (
        <p className="quote-plan quote-plan--secondary">Segunda fase: {quote.surgical_plan_2nd}</p>
      )}

      {/* Procedimientos */}
      {quote.procedures.length > 0 && (
        <div className="quote-procedures">
          <p className="quote-proc-title">Procedimientos incluidos</p>
          {quote.procedures.map((p, i) => (
            <div key={i} className="quote-proc-row">
              <span className="quote-proc-name">{p.product_name ?? 'Procedimiento'}</span>
              {p.surgical_plan_price != null && (
                <span className="quote-proc-price">{formatUSD(p.surgical_plan_price)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resumen financiero */}
      <div className="quote-financials">
        {quote.sub_total != null && (
          <div className="fin-row">
            <span>Subtotal</span>
            <span>{formatUSD(quote.sub_total)}</span>
          </div>
        )}
        {quote.discount != null && quote.discount > 0 && (
          <div className="fin-row fin-row--discount">
            <span>Descuento{quote.discount_reason ? ` (${quote.discount_reason})` : ''}</span>
            <span>− {formatUSD(quote.discount)}</span>
          </div>
        )}
        {quote.tax != null && quote.tax > 0 && (
          <div className="fin-row">
            <span>Impuestos</span>
            <span>{formatUSD(quote.tax)}</span>
          </div>
        )}
        {quote.grand_total != null && (
          <div className="fin-row fin-row--total">
            <span>Inversión total estimada</span>
            <span>{formatUSD(quote.grand_total)}</span>
          </div>
        )}
      </div>

      {/* Noches */}
      {(quote.hotel_nights_before || quote.hospital_nights || quote.recovery_house_nights) && (
        <div className="quote-nights">
          {quote.hotel_nights_before != null && (
            <div className="night-chip">🏨 {quote.hotel_nights_before} noche{quote.hotel_nights_before !== 1 ? 's' : ''} antes</div>
          )}
          {quote.hospital_nights != null && (
            <div className="night-chip">🏥 {quote.hospital_nights} noche{quote.hospital_nights !== 1 ? 's' : ''} hospital</div>
          )}
          {quote.recovery_house_nights != null && (
            <div className="night-chip">🛌 {quote.recovery_house_nights} noche{quote.recovery_house_nights !== 1 ? 's' : ''} recuperación</div>
          )}
        </div>
      )}

      {quote.valid_until && (
        <p className="quote-valid">Válida hasta: {formatDate(quote.valid_until)}</p>
      )}
    </div>
  )
}

function StageReview() {
  return (
    <div className="panel-content">
      <p>Nuestro equipo médico está revisando tu expediente y preparando las recomendaciones finales. Tu coordinadora te contactará pronto para confirmar los siguientes pasos.</p>
    </div>
  )
}

function StageConfirmed({ patient }: { patient: PatientProfile }) {
  return (
    <div className="panel-content">
      <p>Tu depósito ha sido confirmado. Eres parte oficial de la familia CER. En este punto comenzamos la coordinación de tu logística de viaje y recuperación.</p>
      {patient.surgery_plan && <p>Plan quirúrgico confirmado: <strong>{patient.surgery_plan}</strong></p>}
    </div>
  )
}

function StageScheduled({ patient }: { patient: PatientProfile }) {
  return (
    <div className="panel-content">
      <p>Tu cirugía está agendada. Por favor asegúrate de completar tu formulario de itinerario con la información de vuelo, hospedaje e identificaciones.</p>
      {patient.surgery_date && (
        <div className="info-highlight">
          📅 Fecha de cirugía: <strong>{formatDate(patient.surgery_date)}</strong>
        </div>
      )}
      <p>Recibirás tus instrucciones pre-operatorias por correo electrónico la semana anterior a tu cirugía.</p>
    </div>
  )
}

function StageSurgery({ patient }: { patient: PatientProfile }) {
  return (
    <div className="panel-content">
      <p>¡Tu día de cirugía ha llegado! El check-in en Hospital CER es a las <strong>7:00 AM</strong>. Por favor no consumas alimentos ni líquidos después de las 12:00 AM anterior.</p>
    </div>
  )
}

// ─── Secciones estáticas / semi-dinámicas ────────────────────────

function SurgeryIncludes() {
  return (
    <InfoSection title="Lo que incluye tu cirugía ✔">
      {[
        'Equipo quirúrgico certificado',
        'Laboratorios pre y post operatorios',
        'Atención médica 24/7',
        'Prendas de compresión',
        'Estancia hospitalaria',
        'Anestesia y evaluación médica',
        'Medicamentos',
        'Comidas durante la hospitalización',
        'Transporte (San Diego – Tijuana)',
      ].map((item) => (
        <div key={item} className="include-item">
          <span className="include-check">✔</span>
          <span>{item}</span>
        </div>
      ))}
    </InfoSection>
  )
}

function PaymentOptions() {
  return (
    <InfoSection title="Opciones de pago 💳">
      <div className="payment-grid">
        <div className="payment-item">
          <span className="payment-icon">💵</span>
          <div>
            <p className="payment-name">Efectivo</p>
            <p className="payment-note">Día de cirugía · Sin cargo adicional</p>
          </div>
        </div>
        <div className="payment-item">
          <span className="payment-icon">🏦</span>
          <div>
            <p className="payment-name">Wire Transfer</p>
            <p className="payment-note">1 semana antes de la cirugía</p>
          </div>
        </div>
        <div className="payment-item">
          <span className="payment-icon">💳</span>
          <div>
            <p className="payment-name">Visa / Mastercard</p>
            <p className="payment-note">Cargo adicional del 3%</p>
          </div>
        </div>
        <div className="payment-item">
          <span className="payment-icon">⚡</span>
          <div>
            <p className="payment-name">Zelle®</p>
            <p className="payment-note">3 días hábiles antes de cirugía</p>
          </div>
        </div>
      </div>
    </InfoSection>
  )
}

function ItinerarySection({ patient }: { patient: PatientProfile }) {
  const surgDate = patient.surgery_date ? formatDate(patient.surgery_date) : '—'
  return (
    <InfoSection title="Itinerario de tu estancia 📅">
      <div className="itin-days">
        {[
          { day: 'Día 1', title: 'Llegada', desc: `Llega a San Diego entre 8:00 AM – 6:00 PM y haz check-in en tu hotel o casa de recuperación.` },
          { day: 'Día 2', title: `Cirugía — ${surgDate}`, desc: `Check-in en el hospital a las 7:00 AM. Estancia nocturna en Hospital CER.` },
          { day: 'Recuperación', title: 'Estancia de recuperación', desc: 'Recuperación en tu casa de recuperación u hotel seleccionado.' },
          { day: 'Seguimiento', title: 'Cita de seguimiento', desc: 'Disponible a la 1:00 PM los lunes, miércoles y viernes.' },
          { day: 'Partida', title: 'Regreso a casa', desc: 'Coordinado según el progreso de tu recuperación.' },
        ].map((item) => (
          <div key={item.day} className="itin-day">
            <div className="itin-day-badge">{item.day}</div>
            <div>
              <p className="itin-day-title">{item.title}</p>
              <p className="itin-day-desc">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </InfoSection>
  )
}

function RecoveryPlan({ patient, latestQuote }: { patient: PatientProfile; latestQuote: PatientQuote | null }) {
  const nights = latestQuote?.recovery_house_nights ?? null
  return (
    <InfoSection title="Tu plan de recuperación 🛌">
      <p>Estarás con nosotros{nights ? ` ${nights} noches` : ''} después de la cirugía y serás dado de alta según tu progreso médico.</p>
      <p>Para el período de recuperación restante, recomendamos quedarte en una casa de recuperación. Ten en cuenta que la estancia en la casa de recuperación <strong>no está incluida</strong> en tu paquete quirúrgico.</p>
      <p>Tu coordinadora puede ayudarte a coordinar tu estancia, ya sea en un hotel o en una de nuestras casas de recuperación de confianza.</p>
      <div className="info-highlight" style={{ marginTop: 12 }}>
        📧 Coordinación: <strong>patientcoordinator@cergroupco.com</strong>
      </div>
    </InfoSection>
  )
}

function Recommendations() {
  return (
    <InfoSection title="Recomendaciones 📋">
      <div className="rec-grid">
        <div className="rec-card">
          <p className="rec-title">👤 Acompañante</p>
          <div className="rec-rows">
            <div className="rec-row"><span>Acompañantes permitidos</span><span>1</span></div>
            <div className="rec-row"><span>Estancia nocturna en hospital</span><span>Solo 1 persona</span></div>
            <div className="rec-row"><span>Transporte incluido</span><span>1 persona</span></div>
            <div className="rec-row"><span>Acompañante adicional</span><span>$195 USD</span></div>
          </div>
        </div>
        <div className="rec-card">
          <p className="rec-title">✈️ Vuelo de llegada</p>
          <p className="rec-desc">Debe llegar entre 8:00 AM – 6:00 PM el día anterior a la cirugía. Para llegadas más tempranas, puede esperar en el aeropuerto hasta las 8:00 AM.</p>
        </div>
        <div className="rec-card">
          <p className="rec-title">✈️ Vuelo de salida</p>
          <p className="rec-desc">Idealmente 12:30 PM o después. El transporte se programa aproximadamente 4 horas antes. Vuelos fuera de 8:00 AM – 6:00 PM tienen cargo adicional de $55 USD.</p>
        </div>
      </div>
    </InfoSection>
  )
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="info-section">
      <h2 className="section-title">{title}</h2>
      <div className="info-section-body">{children}</div>
    </section>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────
function getStageIndex(
  leadStage: string | null,
  dealStage: string | null,
  dealId: string | null,
  surgeryDate: string | null,
  latestQuote: PatientQuote | null
): number {
  const hasDeal = !!dealId

  if (hasDeal) {
    if (dealStage === 'Closed Won')         return 5
    if (dealStage === 'Surgery Scheduled')  return 4
    if (surgeryDate && getDaysUntil(surgeryDate) !== null && getDaysUntil(surgeryDate)! >= 0) return 4
    return 3
  }

  // Sin Deal — usa lead stage y quote stage
  if (latestQuote) {
    if (['Deposit Paid', 'Approved'].includes(latestQuote.quote_stage)) return 2
    if (['Sent', 'Follow-up'].includes(latestQuote.quote_stage))        return 1
  }

  const leadMap: Record<string, number> = {
    'New Lead': 0, 'Contacted': 0,
    'Quote Sent': 1, 'Nurturing': 1,
    'Pre-Close': 2, 'On Hold': 2,
    'Deposit Secured': 3, 'Deposit Ready': 3,
  }
  return leadMap[leadStage ?? ''] ?? 0
}

function getPatientStatus(
  leadStage: string | null,
  dealStage: string | null,
  converted: boolean
): 'active' | 'paused' | 'inactive' | 'closed_lost' {
  if (dealStage === 'Closed Lost') return 'closed_lost'
  if (converted && dealStage === 'On Hold') return 'paused'
  if (!converted) {
    if (INACTIVE_LEAD.has(leadStage ?? '')) return 'inactive'
    if (PAUSED_LEAD.has(leadStage ?? ''))   return 'paused'
  }
  return 'active'
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function Skeleton() {
  return (
    <div className="dash">
      <div className="skeleton sk-title" />
      <div className="skeleton sk-section" />
      <div className="skeleton sk-section" />
      <style>{dashStyles}</style>
    </div>
  )
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="dash">
      <div className="error-box">⚠ {msg}</div>
      <style>{dashStyles}</style>
    </div>
  )
}

const PAUSED_LEAD   = new Set(['On Hold', 'No Response', 'Nurturing', 'Reactivation Pool', 'Reactivated - Email'])
const INACTIVE_LEAD = new Set(['Not interested', 'Not a Candidate', 'Do Not Contact - HIPAA Compliant'])

// ─── Styles ──────────────────────────────────────────────────────
const dashStyles = `
  .dash {
    max-width: 900px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    padding-bottom: 60px;
  }

  .dash-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
  .dash-title { font-family: var(--font-epilogue,'Epilogue',sans-serif); font-size: 30px; font-weight: 600; color: white; margin: 0 0 6px; letter-spacing: -0.02em; }
  .dash-subtitle { font-size: 14px; color: rgba(255,255,255,.4); margin: 0; }
  .date-chip { background: rgba(0,47,125,.3); border: 1px solid rgba(0,196,204,.15); border-radius: 20px; padding: 8px 16px; font-size: 13px; color: #00c4cc; white-space: nowrap; }

  .banner { padding: 12px 18px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; border: 1px solid; }
  .banner--paused { background: rgba(255,180,0,.06); border-color: rgba(255,180,0,.15); color: rgba(255,220,100,.7); }
  .banner--info   { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.08); color: rgba(255,255,255,.4); }

  /* Countdown */
  .countdown-card { background: linear-gradient(135deg, rgba(0,47,125,.3), rgba(0,10,40,.4)); border: 1px solid rgba(0,196,204,.15); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
  .countdown-inner { display: flex; flex-direction: column; gap: 16px; }
  .countdown-label { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.4); margin: 0 0 4px; }
  .countdown-num { font-family: var(--font-epilogue,'Epilogue',sans-serif); font-size: 64px; font-weight: 700; line-height: 1; letter-spacing: -.04em; margin: 0; }
  .countdown-sub { font-size: 13px; color: rgba(255,255,255,.4); margin: 0; }
  .countdown-bar-wrap { }
  .countdown-bar { height: 4px; background: rgba(255,255,255,.08); border-radius: 2px; overflow: hidden; margin-top: 8px; }
  .countdown-fill { height: 100%; background: linear-gradient(90deg,#002f7d,#00c4cc); transition: width 1s; }

  /* Info cards */
  .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 14px; margin-bottom: 32px; }
  .info-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 20px; text-align: center; }
  .info-card--brand { border-color: rgba(0,196,204,.1); background: rgba(0,196,204,.03); }
  .info-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: rgba(255,255,255,.35); margin: 0 0 12px; }
  .info-avatar { width: 46px; height: 46px; background: linear-gradient(135deg,#002f7d,#033fa2); border: 1px solid rgba(0,196,204,.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: white; margin: 0 auto 10px; }
  .info-avatar--coord { background: linear-gradient(135deg,#0a2a4a,#1a4a6a); }
  .info-name { font-size: 14px; font-weight: 500; color: white; margin: 0; }

  /* Stage section */
  .stage-section { margin-bottom: 32px; }
  .section-title { font-family: var(--font-epilogue,'Epilogue',sans-serif); font-size: 18px; font-weight: 600; color: white; margin: 0 0 20px; letter-spacing: -.01em; }

  /* Stepper */
  .stepper { display: flex; flex-wrap: wrap; gap: 8px; }
  .step-wrap { display: flex; flex-direction: column; flex: 1; min-width: 110px; }

  .step { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.02); cursor: default; text-align: center; transition: all .15s; position: relative; }
  .step--clickable { cursor: pointer; }
  .step--clickable:hover { border-color: rgba(0,196,204,.2); background: rgba(0,196,204,.04); }

  .step-circle { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; border: 2px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: rgba(255,255,255,.3); flex-shrink: 0; }
  .step--done .step-circle   { background: rgba(0,47,125,.5); border-color: #00c4cc; color: #00c4cc; }
  .step--active .step-circle { background: linear-gradient(135deg,#002f7d,#0043b0); border-color: #00c4cc; color: white; box-shadow: 0 0 16px rgba(0,196,204,.25); }

  .step-label { font-size: 11px; color: rgba(255,255,255,.3); }
  .step--done .step-label   { color: rgba(255,255,255,.55); }
  .step--active .step-label { color: #00c4cc; font-weight: 500; }

  .step-chevron { font-size: 9px; color: rgba(255,255,255,.25); }

  /* Stage panels */
  .stage-panel { margin-top: 4px; background: rgba(0,47,125,.12); border: 1px solid rgba(0,196,204,.12); border-radius: 12px; padding: 16px; font-size: 14px; color: rgba(255,255,255,.7); line-height: 1.65; }

  .panel-content { display: flex; flex-direction: column; gap: 12px; }
  .panel-muted   { color: rgba(255,255,255,.4); font-size: 13px; }

  .info-highlight { background: rgba(0,196,204,.06); border: 1px solid rgba(0,196,204,.12); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: rgba(0,196,204,.8); }

  .proc-title { font-size: 12px; color: rgba(255,255,255,.4); margin: 0 0 8px; }
  .proc-list  { display: flex; flex-wrap: wrap; gap: 6px; }
  .proc-tag   { background: rgba(0,47,125,.25); border: 1px solid rgba(0,196,204,.12); border-radius: 6px; padding: 4px 10px; font-size: 12px; color: rgba(255,255,255,.7); }

  /* Quote cards */
  .quote-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 18px; margin-bottom: 12px; }
  .quote-card--latest { border-color: rgba(0,196,204,.15); background: rgba(0,196,204,.03); }
  .quote-card--older  { opacity: .75; }

  .quote-card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  .quote-subject { font-size: 14px; font-weight: 500; color: white; }
  .quote-stage-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: rgba(0,196,204,.1); color: #00c4cc; }
  .stage-deposit-paid .quote-stage-badge { background: rgba(74,222,128,.1); color: #4ade80; }

  .quote-plan          { font-size: 13px; color: rgba(255,255,255,.6); margin: 0; }
  .quote-plan--secondary { color: rgba(255,255,255,.4); }

  .quote-procedures   { background: rgba(255,255,255,.03); border-radius: 8px; padding: 12px; margin: 12px 0; }
  .quote-proc-title   { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.35); margin: 0 0 10px; }
  .quote-proc-row     { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,.7); padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
  .quote-proc-row:last-child { border-bottom: none; }
  .quote-proc-name    { flex: 1; }
  .quote-proc-price   { color: rgba(0,196,204,.8); font-weight: 500; }

  .quote-financials   { display: flex; flex-direction: column; gap: 6px; }
  .fin-row            { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,.6); }
  .fin-row--discount  { color: #4ade80; }
  .fin-row--total     { color: white; font-size: 15px; font-weight: 600; border-top: 1px solid rgba(255,255,255,.08); padding-top: 8px; margin-top: 4px; }

  .quote-nights       { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .night-chip         { font-size: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 20px; padding: 4px 12px; color: rgba(255,255,255,.5); }
  .quote-valid        { font-size: 11px; color: rgba(255,255,255,.3); margin: 10px 0 0; }

  .show-more-btn { background: none; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; color: rgba(255,255,255,.4); font-size: 12px; padding: 8px 16px; cursor: pointer; transition: all .15s; }
  .show-more-btn:hover { border-color: rgba(0,196,204,.3); color: rgba(255,255,255,.7); }

  /* Info sections */
  .info-section      { background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06); border-radius: 16px; padding: 24px; margin-bottom: 16px; }
  .info-section-body { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }

  .include-item  { display: flex; align-items: center; gap: 12px; font-size: 14px; color: rgba(255,255,255,.7); }
  .include-check { color: #4ade80; font-size: 16px; flex-shrink: 0; }

  .payment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 12px; }
  .payment-item { display: flex; align-items: flex-start; gap: 12px; background: rgba(255,255,255,.03); border-radius: 10px; padding: 14px; }
  .payment-icon { font-size: 22px; flex-shrink: 0; }
  .payment-name { font-size: 14px; font-weight: 500; color: white; margin: 0 0 3px; }
  .payment-note { font-size: 12px; color: rgba(255,255,255,.35); margin: 0; }

  .itin-days { display: flex; flex-direction: column; gap: 12px; }
  .itin-day  { display: flex; align-items: flex-start; gap: 14px; }
  .itin-day-badge { background: rgba(0,47,125,.4); border: 1px solid rgba(0,196,204,.15); border-radius: 8px; padding: 4px 10px; font-size: 11px; color: #00c4cc; white-space: nowrap; flex-shrink: 0; }
  .itin-day-title { font-size: 14px; font-weight: 500; color: white; margin: 0 0 3px; }
  .itin-day-desc  { font-size: 13px; color: rgba(255,255,255,.45); margin: 0; }

  .rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 12px; }
  .rec-card { background: rgba(255,255,255,.03); border-radius: 12px; padding: 16px; }
  .rec-title { font-size: 14px; font-weight: 600; color: white; margin: 0 0 10px; }
  .rec-rows  { display: flex; flex-direction: column; gap: 6px; }
  .rec-row   { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,.6); }
  .rec-desc  { font-size: 13px; color: rgba(255,255,255,.5); margin: 0; line-height: 1.6; }

  /* Skeletons */
  .skeleton { background: rgba(255,255,255,.05); border-radius: 14px; animation: pulse 1.5s ease-in-out infinite; margin-bottom: 16px; }
  .sk-title   { height: 40px; width: 240px; }
  .sk-section { height: 160px; }
  @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
  .error-box { background: rgba(255,100,100,.05); border: 1px solid rgba(255,100,100,.15); border-radius: 12px; padding: 24px; font-size: 14px; color: rgba(255,255,255,.5); }

  @media (max-width: 640px) {
    .dash-title { font-size: 24px; }
    .info-grid  { grid-template-columns: 1fr 1fr; }
    .stepper    { flex-direction: column; }
    .step-wrap  { min-width: unset; }
    .step       { flex-direction: row; text-align: left; justify-content: flex-start; }
  }
`