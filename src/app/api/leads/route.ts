import { NextResponse } from 'next/server'
import { fetchLeads, fetchVendas, fetchMetaAds } from '@/lib/sheets'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const [leads, vendas, metaAds] = await Promise.all([fetchLeads(), fetchVendas(), fetchMetaAds()])
    return NextResponse.json(
      { leads, vendas, metaAds, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('Erro ao buscar dados:', err)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
