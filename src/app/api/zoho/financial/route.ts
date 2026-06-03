import { createClient } from '@/lib/supabase/server'
import { getFinancialSummary } from '@/lib/zoho/books'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const financial = await getFinancialSummary(user.email)

  if (!financial) {
    return NextResponse.json({ error: 'No financial records found' }, { status: 404 })
  }

  return NextResponse.json(financial)
}