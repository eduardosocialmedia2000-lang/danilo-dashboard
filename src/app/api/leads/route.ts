import { NextResponse } from 'next/server'
import { fetchLeads, fetchVendas } from '@/lib/sheets'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const [leads, vendas] = await Promise.all([fetchLeads(), fetchVendas()])
    return NextResponse.json(
      { leads, vendas, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('Erro ao buscar dados:', err)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
