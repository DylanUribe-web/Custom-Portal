'use client'

import { useEffect, useState } from 'react'
import type { FinancialSummary } from '@/lib/zoho/books'

// ─── Payment instructions — actualiza con tus datos reales ────────
 const PAYMENT_METHODS = [
  {
    id: 'chase-wire',
    label: 'Wire Transfer — Chase Bank',
    icon: '🏦',
    lines: [
      { label: 'Bank',             value: 'Chase Bank' },
      { label: 'Account Holder',   value: 'CER Group Corporation' },
      { label: 'Account Number',   value: '958895663' },
      { label: 'Routing Number',   value: '322271627' },
      { label: 'SWIFT Code',       value: 'CHASUS33XXX' },
      { label: 'Company Address',  value: '2300 West Sahara Ave, Suite 800, Las Vegas, NV 89102' },
      { label: 'Receiver Bank',    value: '1120 Broadway, Chula Vista, CA 91911, USA' },
    ],
    note: 'Wire transfers may take 1–3 business days to process.',
  },
  {
    id: 'zelle',
    label: 'Zelle — Business Account',
    icon: '⚡',
    lines: [
      { label: 'Name',  value: 'CER Group Corporation' },
      { label: 'Bank',  value: 'Chase Bank' },
      { label: 'Email', value: 'management@cergroupco.com' },
    ],
    note: 'Must be sent as a Business Zelle payment. Include your full name in the memo.',
  },
  {
    id: 'boa-wire',
    label: 'Wire Transfer — Bank of America',
    icon: '🏦',
    lines: [
      { label: 'Bank',            value: 'Bank of America' },
      { label: 'Account Holder',  value: 'CER Group Corporation' },
      { label: 'Account Number',  value: '325085763380' },
      { label: 'Routing Number',  value: '121000358' },
      { label: 'SWIFT Code',      value: 'BOFAUS3N' },
      { label: 'Company Address', value: '2300 West Sahara Ave, Suite 800, Las Vegas, NV 89102' },
    ],
    note: 'Wire transfers may take 1–3 business days to process.',
  },
]

const DAY_OF_SURGERY_METHODS = [
  { icon: '💳', label: 'Terminal at Hospital', note: '3% fee · Visa & Mastercard only' },
  { icon: '💵', label: 'Cash',                 note: 'No fee' },
]

const NOT_ACCEPTED = [
  'Cashier Check', 'Money Orders', 'Personal Check',
  'American Express', 'Care Credit', 'Discover',
]

const POLICIES = [
  {
    title: 'Cancellation Policy',
    icon: '📋',
    items: [
      {
        label: 'More than 1 week before surgery',
        detail: '20% of your total surgical cost will be retained from the deposit.',
      },
      {
        label: '1 week or less before surgery',
        detail: '30% of your total surgical cost will be retained from the deposit.',
      },
    ],
  },
  {
    title: 'Reschedule Policy',
    icon: '📅',
    items: [
      {
        label: 'Up to 2 reschedules',
        detail: 'You may reschedule your procedure up to two times at no charge.',
      },
      {
        label: 'Third reschedule and beyond',
        detail: 'A $100 USD fee applies and will be deducted from your deposit.',
      },
    ],
  },
]

export default function FinancialPage() {
  const [data, setData]       = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/zoho/financial')
      .then((r) => {
        if (!r.ok) throw new Error('Your financial information could not be loaded')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function downloadPdf(invoiceId: string, invoiceNumber: string) {
    setDownloading(invoiceId)
    try {
      const res = await fetch(`/api/zoho/invoice-pdf/${invoiceId}`)
      if (!res.ok) throw new Error('Error downloading PDF')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `CER-Invoice-${invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('The PDF could not be downloaded. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <FinancialSkeleton />
  if (error)   return <ErrorState message={error} />
  if (!data)   return null

  const paidPct = data.total_quote > 0
    ? Math.min(100, Math.round((data.deposit_paid / data.total_quote) * 100))
    : 0

  return (
    <div className="fin-page">

      {/* Header */}
      <div className="fin-header">
        <h1 className="fin-title">My Financial Account</h1>
        <p className="fin-subtitle">
          Summary of payments and invoice history for your CER process.
        </p>
      </div>

      {/* Summary cards */}
      <div className="fin-summary">
        <div className="sum-card sum-card--total">
          <p className="sum-eyebrow">Total quote</p>
          <p className="sum-amount">{formatUSD(data.total_quote)}</p>
          <p className="sum-currency">{data.currency}</p>
        </div>

        <div className="sum-card sum-card--paid">
          <p className="sum-eyebrow">Paid</p>
          <p className="sum-amount sum-amount--paid">{formatUSD(data.deposit_paid)}</p>
          <p className="sum-pct">{paidPct}% of total</p>
        </div>

        <div className={`sum-card ${data.balance_due > 0 ? 'sum-card--balance' : 'sum-card--zero'}`}>
          <p className="sum-eyebrow">Balance due</p>
          <p className={`sum-amount ${data.balance_due > 0 ? 'sum-amount--balance' : 'sum-amount--zero'}`}>
            {formatUSD(data.balance_due)}
          </p>
          <p className="sum-pct">
            {data.balance_due === 0 ? 'Fully paid!' : 'Pending payment'}
          </p>
        </div>
      </div>

      {/* Barra de progreso de pago */}
      <div className="pay-progress">
        <div className="pay-progress-header">
          <span className="pay-progress-label">Payment Progress</span>
          <span className="pay-progress-pct">{paidPct}%</span>
        </div>
        <div className="pay-bar">
          <div
            className="pay-bar-fill"
            style={{ width: `${paidPct}%` }}
          />
        </div>
        <div className="pay-bar-labels">
          <span>$0</span>
          <span>{formatUSD(data.total_quote)}</span>
        </div>
      </div>

      {/* Facturas */}
      <section className="fin-section">
        <h2 className="section-title">Invoices</h2>

        {data.invoices.length === 0 ? (
          <EmptyState message="No invoices registered yet." />
        ) : (
          <div className="invoice-list">
            {data.invoices.map((inv) => {
              const cfg = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.default
              return (
                <div key={inv.invoice_id} className="invoice-card">
                  <div className="invoice-left">
                    <div className="invoice-icon" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon}
                    </div>
                    <div className="invoice-info">
                      <p className="invoice-number">Invoice #{inv.invoice_number}</p>
                      <div className="invoice-meta">
                        <span className="meta-item">Issued: {formatDate(inv.date)}</span>
                        {inv.due_date && (
                          <span className="meta-item">Due: {formatDate(inv.due_date)}</span>
                        )}
                        <span
                          className="meta-item"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="invoice-right">
                    <div className="invoice-amounts">
                      <p className="invoice-total">{formatUSD(inv.total)}</p>
                      {inv.balance > 0 && (
                        <p className="invoice-balance">
                          Pending: {formatUSD(inv.balance)}
                        </p>
                      )}
                    </div>
                    <button
                      className="pdf-btn"
                      onClick={() => downloadPdf(inv.invoice_id, inv.invoice_number)}
                      disabled={downloading === inv.invoice_id}
                    >
                      {downloading === inv.invoice_id ? (
                        <span className="spinner-sm" />
                      ) : '↓'}
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Instrucciones de pago */}
      {data.balance_due > 0 && (
        <section className="fin-section">
            <h2 className="section-title">How to Make Your Payment</h2>
            <p className="section-note">Accepted before surgery date</p>

            <div className="pay-methods">
            {PAYMENT_METHODS.map((method) => (
                <div key={method.id} className="pay-method-card">
                <div className="pay-method-header">
                    <span className="pay-method-icon">{method.icon}</span>
                    <span className="pay-method-label">{method.label}</span>
                </div>
                <div className="pay-method-lines">
                    {method.lines.map((line, i) => (
                    <div key={i} className="pay-line">
                        <span className="pay-line-key">{line.label}</span>
                        <span className="pay-line-val">{line.value}</span>
                    </div>
                    ))}
                </div>
                {method.note && (
                    <p className="pay-method-note">{method.note}</p>
                )}
                </div>
            ))}
            </div>

            {/* Día de cirugía */}
            <div className="day-surgery-block">
            <p className="day-surgery-label">Day of Surgery — At Hospital</p>
            <div className="day-surgery-methods">
                {DAY_OF_SURGERY_METHODS.map((m) => (
                <div key={m.label} className="day-method">
                    <span className="day-method-icon">{m.icon}</span>
                    <div>
                    <p className="day-method-name">{m.label}</p>
                    <p className="day-method-note">{m.note}</p>
                    </div>
                </div>
                ))}
            </div>
            </div>

            {/* No aceptados */}
            <div className="not-accepted-block">
            <p className="not-accepted-title">Not Accepted</p>
            <div className="not-accepted-list">
                {NOT_ACCEPTED.map((item) => (
                <span key={item} className="not-accepted-chip">
                    <span className="chip-x">✕</span> {item}
                </span>
                ))}
            </div>
            </div>

            <p className="pay-footer-note">
            Once payment is sent, please share your receipt with your coordinator
            so it can be applied to your account.
            </p>
        </section>
        )}

        {/* Políticas — siempre visibles */}
        <section className="fin-section">
        <h2 className="section-title">Policies</h2>
        <div className="policies-grid">
            {POLICIES.map((policy) => (
            <div key={policy.title} className="policy-card">
                <div className="policy-header">
                <span>{policy.icon}</span>
                <span className="policy-title">{policy.title}</span>
                </div>
                <div className="policy-items">
                {policy.items.map((item, i) => (
                    <div key={i} className="policy-item">
                    <p className="policy-item-label">{item.label}</p>
                    <p className="policy-item-detail">{item.detail}</p>
                    </div>
                ))}
                </div>
            </div>
            ))}
        </div>
        </section>
      <style>{finStyles}</style>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────
const INVOICE_STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  paid:             { label: 'Paid',           color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  icon: '✓' },
  unpaid:           { label: 'Unpaid',         color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  icon: '◷' },
  partially_paid:   { label: 'Partially Paid',     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  icon: '◑' },
  void:             { label: 'Void',           color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: '✕' },
  default:          { label: 'Pending',          color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  icon: '◷' },
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(str: string): string {
  return new Date(str).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Sub-componentes ──────────────────────────────────────────────
function FinancialSkeleton() {
  return (
    <div className="fin-page">
      <div className="skeleton skeleton--title" />
      <div className="fin-summary" style={{ marginTop: 28 }}>
        {[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton--sum" />)}
      </div>
      <div style={{ marginTop: 24 }}>
        {[1, 2].map((i) => <div key={i} className="skeleton skeleton--inv" style={{ marginBottom: 10 }} />)}
      </div>
      <style>{finStyles}</style>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="fin-page">
      <div className="error-state">⚠ {message}</div>
      <style>{finStyles}</style>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">◇</span>
      <p>{message}</p>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────
const finStyles = `
  .fin-page {
    max-width: 860px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
  }

  .fin-header { margin-bottom: 28px; }

  .fin-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 30px;
    font-weight: 600;
    color: white;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }

  .fin-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.4);
    margin: 0;
  }

  /* Summary cards */
  .fin-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }

  .sum-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 22px 20px;
  }

  .sum-card--total  { border-color: rgba(255,255,255,0.09); }
  .sum-card--paid   { border-color: rgba(74,222,128,0.15); background: rgba(74,222,128,0.03); }
  .sum-card--balance{ border-color: rgba(251,191,36,0.15);  background: rgba(251,191,36,0.03); }
  .sum-card--zero   { border-color: rgba(74,222,128,0.2);   background: rgba(74,222,128,0.04); }

  .sum-eyebrow {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0 0 10px;
  }

  .sum-amount {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 28px;
    font-weight: 700;
    color: white;
    margin: 0 0 4px;
    letter-spacing: -0.03em;
  }

  .sum-amount--paid    { color: #4ade80; }
  .sum-amount--balance { color: #fbbf24; }
  .sum-amount--zero    { color: #4ade80; }

  .sum-currency, .sum-pct {
    font-size: 12px;
    color: rgba(255,255,255,0.3);
    margin: 0;
  }

  /* Payment progress */
  .pay-progress {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 20px 22px;
    margin-bottom: 36px;
  }

  .pay-progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .pay-progress-label {
    font-size: 13px;
    color: rgba(255,255,255,0.45);
  }

  .pay-progress-pct {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 13px;
    font-weight: 600;
    color: #00c4cc;
  }

  .pay-bar {
    height: 6px;
    background: rgba(255,255,255,0.06);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .pay-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #002f7d, #00c4cc);
    border-radius: 4px;
    transition: width 1s ease;
  }

  .pay-bar-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: rgba(255,255,255,0.2);
  }

  /* Sections */
  .fin-section { margin-bottom: 40px; }

  .section-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 16px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    margin: 0 0 16px;
  }

  /* Invoice list */
  .invoice-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .invoice-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 16px 20px;
    transition: border-color 0.2s;
  }

  .invoice-card:hover { border-color: rgba(255,255,255,0.12); }

  .invoice-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
  }

  .invoice-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
  }

  .invoice-number {
    font-size: 14px;
    font-weight: 500;
    color: white;
    margin: 0 0 6px;
  }

  .invoice-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .meta-item {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.04);
    border-radius: 4px;
    padding: 3px 8px;
  }

  .invoice-right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }

  .invoice-amounts { text-align: right; }

  .invoice-total {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 16px;
    font-weight: 600;
    color: white;
    margin: 0 0 2px;
  }

  .invoice-balance {
    font-size: 11px;
    color: #fbbf24;
    margin: 0;
  }

  .pdf-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0,47,125,0.3);
    border: 1px solid rgba(0,196,204,0.15);
    border-radius: 8px;
    color: rgba(255,255,255,0.6);
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
    font-size: 12px;
    padding: 8px 14px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .pdf-btn:hover:not(:disabled) {
    border-color: rgba(0,196,204,0.35);
    color: white;
  }

  .pdf-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .spinner-sm {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #00c4cc;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Payment methods */
  .pay-methods {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
    margin-bottom: 16px;
  }

  .pay-method-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 20px;
  }

  .pay-method-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .pay-method-icon { font-size: 20px; }

  .pay-method-label {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 15px;
    font-weight: 600;
    color: white;
  }

  .pay-method-lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }

  .pay-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .pay-line-key {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .pay-line-val {
    font-size: 13px;
    color: rgba(255,255,255,0.75);
    text-align: right;
  }

  .pay-method-note {
    font-size: 12px;
    color: rgba(255,255,255,0.3);
    margin: 0;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
    line-height: 1.5;
  }

  .pay-footer-note {
    font-size: 12px;
    color: rgba(255,255,255,0.25);
    margin: 0;
    line-height: 1.6;
  }

  /* Skeletons */
  .skeleton {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton--title { height: 36px; width: 220px; margin-bottom: 8px; }
  .skeleton--sum   { height: 100px; }
  .skeleton--inv   { height: 72px; }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1; }
  }

  .empty-state {
    text-align: center;
    padding: 48px 24px;
    border: 1px dashed rgba(255,255,255,0.08);
    border-radius: 14px;
  }

  .empty-icon {
    font-size: 32px;
    color: rgba(255,255,255,0.15);
    display: block;
    margin-bottom: 12px;
  }

  .empty-state p {
    font-size: 14px;
    color: rgba(255,255,255,0.3);
    margin: 0;
  }

  .error-state {
    background: rgba(255,100,100,0.05);
    border: 1px solid rgba(255,100,100,0.15);
    border-radius: 12px;
    padding: 24px;
    color: rgba(255,255,255,0.5);
    font-size: 14px;
  }

  .section-note {
    font-size: 12px;
    color: rgba(255,255,255,0.25);
    margin: -10px 0 16px;
  }

  /* Día de cirugía */
  .day-surgery-block {
    background: rgba(0,196,204,0.04);
    border: 1px solid rgba(0,196,204,0.1);
    border-radius: 14px;
    padding: 18px 20px;
    margin: 14px 0;
  }

  .day-surgery-label {
    font-size: 12px;
    font-weight: 500;
    color: rgba(0,196,204,0.7);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0 0 14px;
  }

  .day-surgery-methods {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }

  .day-method {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .day-method-icon { font-size: 22px; }

  .day-method-name {
    font-size: 14px;
    font-weight: 500;
    color: white;
    margin: 0 0 2px;
  }

  .day-method-note {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    margin: 0;
  }

  /* No aceptados */
  .not-accepted-block {
    margin: 14px 0;
  }

  .not-accepted-title {
    font-size: 12px;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin: 0 0 10px;
  }

  .not-accepted-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .not-accepted-chip {
    font-size: 12px;
    color: rgba(248,113,113,0.6);
    background: rgba(248,113,113,0.06);
    border: 1px solid rgba(248,113,113,0.1);
    border-radius: 6px;
    padding: 4px 10px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .chip-x {
    font-size: 10px;
    opacity: 0.7;
  }

  /* Políticas */
  .policies-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
  }

  .policy-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 20px;
  }

  .policy-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    font-size: 16px;
  }

  .policy-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 15px;
    font-weight: 600;
    color: white;
  }

  .policy-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .policy-item {
    padding-left: 12px;
    border-left: 2px solid rgba(0,196,204,0.2);
  }

  .policy-item-label {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255,255,255,0.7);
    margin: 0 0 4px;
  }

  .policy-item-detail {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    margin: 0;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .policies-grid { grid-template-columns: 1fr; }
    .day-surgery-methods { flex-direction: column; gap: 12px; }
  }

  @media (max-width: 640px) {
    .fin-summary { grid-template-columns: 1fr; }
    .invoice-card { flex-direction: column; align-items: flex-start; }
    .invoice-right { width: 100%; justify-content: space-between; }
  }
`