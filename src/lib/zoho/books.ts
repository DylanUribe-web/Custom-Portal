import { getZohoAccessToken } from './token'

const BASE = process.env.ZOHO_BOOKS_BASE!   // https://www.zohoapis.com/books/v3
const ORG   = process.env.ZOHO_ORG_ID!

async function get<T = any>(path: string): Promise<T> {
  const token = await getZohoAccessToken()
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE}${path}${sep}organization_id=${ORG}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Books ${res.status} → ${path}`)
  return res.json()
}

export interface FinancialSummary {
  customer_id: string | null
  total_quote: number
  deposit_paid: number
  balance_due: number
  currency: string
  invoices: Invoice[]
}

export interface Invoice {
  invoice_id: string
  invoice_number: string
  date: string
  due_date: string | null
  total: number
  balance: number
  status: string   // 'paid' | 'unpaid' | 'partially_paid' | 'void'
  pdf_url: string | null
}

export async function getFinancialSummary(email: string): Promise<FinancialSummary | null> {
  try {
    // 1. Busca el customer en Books por email
    const contactsRes = await get(`/contacts?email=${encodeURIComponent(email)}&contact_type=customer`)
    const customers = contactsRes.contacts ?? []
    if (customers.length === 0) return null

    const customer = customers[0]
    const customerId: string = customer.contact_id

    // 2. Jala invoices del customer
    const invoicesRes = await get(`/invoices?customer_id=${customerId}&sort_column=date&sort_order=D`)
    const rawInvoices: any[] = invoicesRes.invoices ?? []

    const invoices: Invoice[] = rawInvoices.map((inv) => ({
      invoice_id: inv.invoice_id,
      invoice_number: inv.invoice_number,
      date: inv.date,
      due_date: inv.due_date ?? null,
      total: inv.total,
      balance: inv.balance,
      status: inv.status,
      pdf_url: null, // Se genera on-demand con endpoint separado
    }))

    // 3. Calcula totales
    const totalQuote = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const depositPaid = invoices.reduce((sum, inv) => sum + (inv.total - inv.balance), 0)
    const balanceDue = invoices.reduce((sum, inv) => sum + inv.balance, 0)

    return {
      customer_id: customerId,
      total_quote: totalQuote,
      deposit_paid: depositPaid,
      balance_due: balanceDue,
      currency: customer.currency_code ?? 'USD',
      invoices,
    }
  } catch (e) {
    console.error('[Books] getFinancialSummary error:', e)
    return null
  }
}

// PDF on-demand — devuelve la URL directa del invoice en Books
export async function getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
  try {
    // Zoho Books devuelve el PDF como stream — generamos la URL de descarga
    // En el cliente se abre en nueva pestaña o se hace download directo
    return `${BASE}/invoices/${invoiceId}?accept=pdf&organization_id=${ORG}`
  } catch {
    return null
  }
}