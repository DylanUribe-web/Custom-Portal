import { createClient } from '@/lib/supabase/server'
import { getZohoAccessToken } from '@/lib/zoho/token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verifica sesión
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const token = await getZohoAccessToken()
  const orgId = process.env.ZOHO_ORG_ID!
  const base  = process.env.ZOHO_BOOKS_BASE!

  const pdfRes = await fetch(
    `${base}/invoices/${id}?accept=pdf&organization_id=${orgId}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  )

  if (!pdfRes.ok) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
  }

  const buffer = await pdfRes.arrayBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
    },
  })
}