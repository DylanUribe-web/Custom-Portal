'use client'

import { useEffect, useState } from 'react'
import type { PatientProfile } from '@/lib/zoho/crm'

// Stages visibles para el paciente — solo los positivos/avanzables
// Los negativos (On Hold, No Response, etc.) muestran un estado especial
const STAGES = [
  { key: 'contact',   label: 'Initial contact' },
  { key: 'quote',     label: 'Quote'            },
  { key: 'review',    label: 'In Review'          },
  { key: 'deposit',   label: 'Deposit'            },
  { key: 'deal',      label: 'Confirmed'          },
  { key: 'scheduled', label: 'Scheduled'            },
  { key: 'surgery',   label: 'Surgery'              },
]

// Lead stages que indican progreso pausado — mostramos mensaje especial
const PAUSED_STAGES_LEAD = new Set([
  'On Hold', 'No Response', 'Nurturing', 'Reactivation Pool', 'Reactivated - Email',
])

// Lead stages que significan que no sigue en el proceso
const INACTIVE_STAGES_LEAD = new Set([
  'Not interested', 'Not a Candidate', 'Do Not Contact - HIPAA Compliant',
])

interface PatientResponse {
  patient: PatientProfile
}

export default function DashboardPage() {
  const [data, setData] = useState<PatientResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/zoho/patient')
      .then((r) => {
        if (!r.ok) throw new Error('Unable to load your information. Please try again later.')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />
  if (error)   return <ErrorState message={error} />
  if (!data)   return null

  const { patient } = data
  const daysLeft = getDaysUntil(patient.surgery_date)
  const stageIndex = getStageIndex(
    patient.lead_stage,
    patient.deal_stage,
    patient.converted,
    patient.surgery_date
  )

  // Devuelve si el paciente está en un estado "pausado" o "inactivo"
  function getPatientStatus(
    leadStage: string | null,
    dealStage: string | null,
    converted: boolean
  ): 'active' | 'paused' | 'inactive' | 'closed_lost' {
    if (dealStage === 'Closed Lost') return 'closed_lost'
    if (converted) {
      if (dealStage === 'On Hold') return 'paused'
      return 'active'
    }
    if (!leadStage) return 'active'
    if (INACTIVE_STAGES_LEAD.has(leadStage)) return 'inactive'
    if (PAUSED_STAGES_LEAD.has(leadStage))   return 'paused'
    return 'active'
  }

  return (
    <div className="dash">
      {/* Encabezado */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">
            Hola, {patient.first_name}
          </h1>
          <p className="dash-subtitle">
            {patient.surgery_date
              ? 'Here is the summary of your process with CER.'
              : 'Your coordinator is preparing your treatment plan.'}
          </p>
        </div>
        {patient.surgery_date && (
          <div className="date-chip">
            {formatDate(patient.surgery_date)}
          </div>
        )}
      </div>

      {/* Grid principal */}
      <div className="dash-grid">
        {/* Countdown */}
        {patient.surgery_date && daysLeft !== null && (
          <div className="card card--countdown">
            <p className="card-eyebrow">Days Until Your Surgery</p>
            <div className="countdown-number">{daysLeft}</div>
            <p className="countdown-label">
              {daysLeft === 0 ? 'It’s Today!' : daysLeft === 1 ? 'tomorrow' : 'days remaining'}
            </p>
            <div className="countdown-bar">
              <div
                className="countdown-fill"
                style={{ width: `${Math.max(5, 100 - (daysLeft / 90) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Marca / Brand */}
        {patient.brand && (
          <div className="card card--brand">
            <p className="card-eyebrow">Program</p>
            <p className="brand-name">{patient.brand}</p>
          </div>
        )}

        {/* Surgery Plan */}
        {patient.surgery_plan && (
          <div className="card card--plan">
            <p className="card-eyebrow">Surgical Plan</p>
            <p className="plan-name">{patient.surgery_plan}</p>
            {patient.amount && (
              <p className="plan-amount">
                ${patient.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })} USD
              </p>
            )}
          </div>
        )}

        {/* Cirujano */}
        {patient.surgeon && (
          <div className="card card--person">
            <p className="card-eyebrow">Your surgeon</p>
            <div className="person-avatar">
              {patient.surgeon.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <p className="person-name">{patient.surgeon}</p>
            <p className="person-role">Plastic Surgeon</p>
          </div>
        )}

        {/* Coordinadora */}
        {patient.coordinator && (
          <div className="card card--person">
            <p className="card-eyebrow">Your coordinator</p>
            <div className="person-avatar person-avatar--coord">
              {patient.coordinator.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <p className="person-name">{patient.coordinator}</p>
            <p className="person-role">Patient Coordinator</p>
          </div>
        )}

        {/* Procedimientos */}
        {patient.procedures.length > 0 && (
          <div className="card card--procs">
            <p className="card-eyebrow">Procedures of interest</p>
            <div className="proc-list">
              {patient.procedures.map((proc, i) => (
                <span key={i} className="proc-tag">{proc}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="progress-section">
        <h2 className="section-title">Your Process</h2>
        {/* Aviso si el proceso está pausado */}
        {(() => {
          const patientStatus = getPatientStatus(
            patient.lead_stage,
            patient.deal_stage,
            patient.converted
          )
          {patientStatus === 'paused' && (
            <div className="status-banner status-banner--paused">
              <span>⏸</span>
              <p>Your process is paused. Your coordinator will contact you soon.</p>
            </div>
          )}
          {patientStatus === 'inactive' && (
            <div className="status-banner status-banner--info">
              <span>ℹ</span>
              <p>To reactivate your consultation, please contact our team directly.</p>
            </div>
          )}
          {patientStatus === 'closed_lost' && (
            <div className="status-banner status-banner--info">
              <span>ℹ</span>
              <p>Your file is closed. If you wish to resume the process, please contact us.</p>
            </div>
          )}
          return null
        })()}
        <div className="stepper">
          {STAGES.map((stage, i) => {
            const state = i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending'
            return (
              <div key={stage.key} className={`step step--${state}`}>
                <div className="step-circle">
                  {state === 'done' ? '✓' : i + 1}
                </div>
                <span className="step-label">{stage.label}</span>
                {i < STAGES.length - 1 && (
                  <div className={`step-line step-line--${state === 'done' ? 'done' : 'pending'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style>{dashStyles}</style>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  return Math.max(0, diff)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function getStageIndex(
  leadStage: string | null,
  dealStage: string | null,
  converted: boolean,
  surgeryDate: string | null
): number {
  // ── Post-conversión: usa Deal Stage ─────────────────────────
  if (converted) {
    if (dealStage === 'Closed Won')          return 6
    if (dealStage === 'Surgery Scheduled')   return 5
    if (dealStage === 'Deal Review')         return 4
    if (dealStage === 'On Hold')             return 4
    // Fallback por fecha
    if (surgeryDate && getDaysUntil(surgeryDate) === 0) return 6
    if (surgeryDate)                         return 5
    return 4
  }

  // ── Pre-conversión: usa Lead_Status ──────────────────────────
  const leadMap: Record<string, number> = {
    'New Lead':        0,
    'Contacted':       0,
    'Quote Sent':      1,
    'Nurturing':       1,
    'Pre-Close':       2,
    'On Hold':         2,
    'Deposit Secured': 3,
    'Deposit Ready':   3,
  }
  return leadMap[leadStage ?? ''] ?? 0
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="dash">
      <div className="skeleton skeleton--title" />
      <div className="dash-grid" style={{ marginTop: 32 }}>
        {[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton--card" />)}
      </div>
      <style>{dashStyles}</style>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="dash">
      <div className="error-state">
        <p>⚠ {message}</p>
      </div>
      <style>{dashStyles}</style>
    </div>
  )
}

const dashStyles = `
  .dash {
    max-width: 900px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
  }

  .dash-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 36px;
  }

  .dash-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 30px;
    font-weight: 600;
    color: white;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }

  .dash-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.4);
    margin: 0;
  }

  .date-chip {
    background: rgba(0,47,125,0.3);
    border: 1px solid rgba(0,196,204,0.15);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 13px;
    color: #00c4cc;
    white-space: nowrap;
  }

  .dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 40px;
  }

  /* Cards base */
  .card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 24px;
    backdrop-filter: blur(10px);
    transition: border-color 0.2s;
  }

  .card:hover {
    border-color: rgba(0,196,204,0.15);
  }

  .card-eyebrow {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 16px;
  }

  /* Countdown */
  .card--countdown {
    background: linear-gradient(135deg, rgba(0,47,125,0.3), rgba(0,10,40,0.4));
    border-color: rgba(0,196,204,0.15);
  }

  .countdown-number {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 64px;
    font-weight: 700;
    color: white;
    line-height: 1;
    letter-spacing: -0.04em;
    margin-bottom: 4px;
  }

  .countdown-label {
    font-size: 13px;
    color: rgba(255,255,255,0.4);
    margin: 0 0 20px;
  }

  .countdown-bar {
    height: 3px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .countdown-fill {
    height: 100%;
    background: linear-gradient(90deg, #002f7d, #00c4cc);
    border-radius: 2px;
    transition: width 1s ease;
  }

  /* Person card */
  .card--person {
    text-align: center;
  }

  .person-avatar {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #002f7d, #033fa2);
    border: 1px solid rgba(0,196,204,0.2);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 600;
    color: white;
    margin: 0 auto 12px;
  }

  .person-avatar--coord {
    background: linear-gradient(135deg, #0a2a4a, #1a4a6a);
  }

  .person-name {
    font-size: 15px;
    font-weight: 500;
    color: white;
    margin: 0 0 4px;
  }

  .person-role {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    margin: 0;
  }

  /* Procedures */
  .card--procs {
    grid-column: span 2;
  }

  .proc-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .proc-tag {
    background: rgba(0,47,125,0.25);
    border: 1px solid rgba(0,196,204,0.12);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    color: rgba(255,255,255,0.7);
  }

  /* Progress stepper */
  .progress-section {
    margin-top: 8px;
  }

  .section-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 18px;
    font-weight: 600;
    color: white;
    margin: 0 0 24px;
    letter-spacing: -0.01em;
  }

  .stepper {
    display: flex;
    align-items: flex-start;
    padding-bottom: 8px;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    position: relative;
    flex: 1;
    min-width: 80px;
  }

  .step-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    border: 2px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.3);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .step--done .step-circle {
    background: rgba(0,47,125,0.5);
    border-color: #00c4cc;
    color: #00c4cc;
  }

  .step--active .step-circle {
    background: linear-gradient(135deg, #002f7d, #0043b0);
    border-color: #00c4cc;
    color: white;
    box-shadow: 0 0 16px rgba(0,196,204,0.25);
  }

  .step-label {
    font-size: 11px;
    color: rgba(255,255,255,0.3);
    text-align: center;
    white-space: nowrap;
  }

  .step--done .step-label  { color: rgba(255,255,255,0.55); }
  .step--active .step-label { color: #00c4cc; font-weight: 500; }

  .step-line {
    position: absolute;
    top: 18px;
    left: calc(50% + 18px);
    right: calc(-50% + 18px);
    height: 2px;
    background: rgba(255,255,255,0.07);
  }

  .step-line--done {
    background: linear-gradient(90deg, #00c4cc, rgba(0,196,204,0.3));
  }

  /* Skeleton */
  .skeleton {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton--title {
    height: 40px;
    width: 240px;
    margin-bottom: 8px;
  }

  .skeleton--card {
    height: 160px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .error-state {
    background: rgba(255,100,100,0.05);
    border: 1px solid rgba(255,100,100,0.15);
    border-radius: 12px;
    padding: 24px;
    color: rgba(255,255,255,0.5);
    font-size: 14px;
  }

  .status-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 10px;
    font-size: 13px;
    margin-bottom: 24px;
    border: 1px solid;
  }

  .status-banner p { margin: 0; }
  .status-banner span { font-size: 18px; flex-shrink: 0; }

  .status-banner--paused {
    background: rgba(255,180,0,0.06);
    border-color: rgba(255,180,0,0.15);
    color: rgba(255,220,100,0.7);
  }

  .status-banner--info {
    background: rgba(255,255,255,0.03);
    border-color: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.4);
  }

  .card--brand {
    background: rgba(0,196,204,0.04);
    border-color: rgba(0,196,204,0.1);
  }

  .brand-name {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 16px;
    font-weight: 600;
    color: white;
    margin: 0;
  }

  .card--plan {
    background: rgba(0,47,125,0.15);
  }

  .plan-name {
    font-size: 15px;
    font-weight: 500;
    color: white;
    margin: 0 0 8px;
  }

  .plan-amount {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 22px;
    font-weight: 700;
    color: #00c4cc;
    margin: 0;
    letter-spacing: -0.02em;
  }

  @media (max-width: 640px) {
    .dash-title { font-size: 24px; }
    .dash-grid { grid-template-columns: 1fr 1fr; }
    .card--procs { grid-column: span 2; }
  }
`