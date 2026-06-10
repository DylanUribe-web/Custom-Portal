'use client'

import { useEffect, useState } from 'react'
import type { ZohoSignDoc, SurgeryConfirmationDoc } from '@/lib/zoho/crm'

interface DocsResponse {
  documents: ZohoSignDoc[]
  surgery_confirmations: SurgeryConfirmationDoc[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  'Signed':            { label: 'Signed',          color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  icon: '✓' },
  'Out for Signature': { label: 'Pending Signature',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  icon: '⏳' },
  'Recalled':          { label: 'Recalled',        color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: '✕' },
  'Expired':           { label: 'Expired',         color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: '!' },
}

export default function DocumentsPage() {
  const [data, setData] = useState<DocsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/zoho/documents')
      .then((r) => {
        if (!r.ok) throw new Error('Unable to load your documents')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DocsSkeleton />
  if (error)   return <ErrorState message={error} />
  if (!data)   return null

  // Justo después de validar data
  const { documents: rawDocs, surgery_confirmations } = data

  // Ordena: pendientes primero, luego firmados, luego el resto
  const PRIORITY: Record<string, number> = {
    'Out for Signature': 0,
    'Signed':            1,
    'Expired':           2,
    'Recalled':          3,
  }

  const documents = [...rawDocs].sort((a, b) =>
    (PRIORITY[a.status] ?? 5) - (PRIORITY[b.status] ?? 5)
  )

  // Documentos activos vs histórico
  const activeDocs = documents.filter(
    (d) => d.status !== 'Recalled' && d.status !== 'Expired' && d.status !== 'Drafted'

  )

  const historyDocs = documents.filter(
    (d) => d.status === 'Recalled' || d.status === 'Expired'
  )

  // Resumen
  const visibleDocuments = documents.filter(
    doc => doc.status !== 'Drafted'
  )
  const total = visibleDocuments.length
  const signed  = visibleDocuments.filter((d) => d.status === 'Signed').length
  const pending = visibleDocuments.filter((d) => d.status === 'Out for Signature').length

  return (
    <div className="docs-page">

      {/* Header */}
      <div className="docs-header">
        <div>
          <h1 className="docs-title">My Documents</h1>
          <p className="docs-subtitle">
            Documents sent by CER for your surgical process.
          </p>
        </div>
      </div>

      {/* Resumen */}
      {total > 0 && (
        <div className="docs-summary">
          <div className="summary-chip summary-chip--total">
            <span className="chip-num">{total}</span>
            <span className="chip-label">Total</span>
          </div>
          <div className="summary-chip summary-chip--signed">
            <span className="chip-num">{signed}</span>
            <span className="chip-label">Signed</span>
          </div>
          <div className="summary-chip summary-chip--pending">
            <span className="chip-num">{pending}</span>
            <span className="chip-label">Pending</span>
          </div>
        </div>
      )}

      {/* Documentos ZohoSign */}
      <section className="docs-section">
        <h2 className="section-title">Documents to Sign</h2>

        {activeDocs.length === 0 ? (
          <EmptyState message="No documents sent yet." />
        ) : (
          <>
            <div className="docs-list">
              {activeDocs.map((doc) => (
                <DocCard key={doc.id} doc={doc} />
              ))}
            </div>
            {/* Histórico colapsable */}
            {historyDocs.length > 0 && (
              <details className="history-details">
                <summary className="history-summary">
                  Previous versions ({historyDocs.length})
                </summary>
                <div className="docs-list" style={{ marginTop: 10 }}>
                  {historyDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)}
                </div>
              </details>
            )}
          </>
        )}
      </section>

      {/* Surgery Confirmation */}
      {surgery_confirmations.length > 0 && (
        <section className="docs-section">
          <h2 className="section-title">Surgery Confirmation</h2>
          <div className="docs-list">
            {surgery_confirmations.map((sc) => (
              <SurgeryConfirmationCard key={sc.id} record={sc} />
            ))}
          </div>
        </section>
      )}

      <style>{docsStyles}</style>
    </div>
  )
}

// ─── Doc Card ─────────────────────────────────────────────────────
function DocCard({ doc }: { doc: ZohoSignDoc }) {
  const cfg = STATUS_CONFIG[doc.status] ?? {
    label: doc.status, color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: '◻',
  }

  return (
    <div className="doc-card">
      <div className="doc-card-left">
        <div className="doc-icon" style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.icon}
        </div>
        <div className="doc-info">
          <p className="doc-name">{doc.name}</p>
          <div className="doc-meta">
            {doc.sent_date && (
              <span className="meta-item">
                Enviado: {formatDate(doc.sent_date)}
              </span>
            )}
            {doc.deadline && (
              <span className={`meta-item ${isExpiringSoon(doc.deadline) ? 'meta-item--warn' : ''}`}>
                Vence: {formatDate(doc.deadline)}
              </span>
            )}
            {doc.completed_date && (
              <span className="meta-item meta-item--success">
                Firmado: {formatDate(doc.completed_date)}
              </span>
            )}
            {doc.sent_from_module && (
              <span className="meta-item meta-item--module">
                {doc.sent_from_module}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="doc-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </div>
    </div>
  )
}

// ─── Surgery Confirmation Card ────────────────────────────────────
function SurgeryConfirmationCard({ record }: { record: SurgeryConfirmationDoc }) {
  return (
    <div className="doc-card doc-card--surgery">
      <div className="doc-card-left">
        <div className="doc-icon" style={{ background: 'rgba(0,196,204,0.08)', color: '#00c4cc' }}>
          ◎
        </div>
        <div className="doc-info">
          <p className="doc-name">{record.name}</p>
          <div className="doc-meta">
            <span className="meta-item">
              Flight, accommodation and identification details
            </span>
            {record.status && (
              <span className="meta-item">{record.status}</span>
            )}
          </div>
        </div>
      </div>
      <div className="doc-status-badge" style={{ background: 'rgba(0,196,204,0.08)', color: '#00c4cc' }}>
        {record.status || 'Recibido'}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatDate(str: string): string {
  return new Date(str).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function isExpiringSoon(deadline: string): boolean {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  return days >= 0 && days <= 3
}

function DocsSkeleton() {
  return (
    <div className="docs-page">
      <div className="skeleton skeleton--title" />
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton--card" />)}
      </div>
      <style>{docsStyles}</style>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="docs-page">
      <div className="error-state">⚠ {message}</div>
      <style>{docsStyles}</style>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">◻</span>
      <p>{message}</p>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────
const docsStyles = `
  .docs-page {
    max-width: 860px;
    color: white;
    font-family: var(--font-dm-sans, 'DM Sans', sans-serif);
  }

  .docs-header {
    margin-bottom: 28px;
  }

  .docs-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 30px;
    font-weight: 600;
    color: white;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }

  .docs-subtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.4);
    margin: 0;
  }

  /* Resumen */
  .docs-summary {
    display: flex;
    gap: 12px;
    margin-bottom: 36px;
    flex-wrap: wrap;
  }

  .summary-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.03);
  }

  .chip-num {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
  }

  .chip-label {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
  }

  .summary-chip--total .chip-num   { color: rgba(255,255,255,0.8); }
  .summary-chip--signed .chip-num  { color: #4ade80; }
  .summary-chip--pending .chip-num { color: #fbbf24; }

  /* Secciones */
  .docs-section {
    margin-bottom: 40px;
  }

  .section-title {
    font-family: var(--font-epilogue, 'Epilogue', sans-serif);
    font-size: 16px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    margin: 0 0 16px;
    letter-spacing: -0.01em;
  }

  /* Lista */
  .docs-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Doc card */
  .doc-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 18px 20px;
    transition: border-color 0.2s;
  }

  .doc-card:hover {
    border-color: rgba(255,255,255,0.12);
  }

  .doc-card--surgery {
    border-color: rgba(0,196,204,0.1);
    background: rgba(0,196,204,0.03);
  }

  .doc-card-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
  }

  .doc-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .doc-info {
    flex: 1;
    min-width: 0;
  }

  .doc-name {
    font-size: 14px;
    font-weight: 500;
    color: white;
    margin: 0 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .doc-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .meta-item {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.04);
    border-radius: 4px;
    padding: 3px 8px;
  }

  .meta-item--warn    { color: #fbbf24; background: rgba(251,191,36,0.08); }
  .meta-item--success { color: #4ade80; background: rgba(74,222,128,0.08); }
  .meta-item--module  { color: rgba(0,196,204,0.6); }

  /* Status badge */
  .doc-status-badge {
    font-size: 12px;
    font-weight: 500;
    padding: 6px 14px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Empty */
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

  /* Skeletons */
  .skeleton {
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    animation: pulse 1.5s ease-in-out infinite;
  }
  .skeleton--title { height: 36px; width: 200px; margin-bottom: 8px; }
  .skeleton--card  { height: 76px; }

  .history-details {
    margin-top: 16px;
  }

  .history-summary {
    font-size: 12px;
    color: rgba(255,255,255,0.25);
    cursor: pointer;
    padding: 8px 0;
    list-style: none;
    transition: color 0.15s;
  }

  .history-summary:hover {
    color: rgba(255,255,255,0.45);
  }

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

  @media (max-width: 640px) {
    .doc-card { flex-direction: column; align-items: flex-start; }
    .doc-status-badge { align-self: flex-start; }
  }
`