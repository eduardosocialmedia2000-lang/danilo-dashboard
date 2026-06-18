// ---- Tipos ----

export interface LeadRaw {
  id: string
  nome: string
  pipeline: string
  etapa: string
  status: string
  cidade: string
  dataEntrada: string
  ultimaAtualizacao: string
  utmSource: string
  utmCampaign: string
}

export interface Lead extends Omit<LeadRaw, 'dataEntrada' | 'ultimaAtualizacao'> {
  dataEntrada: Date
  ultimaAtualizacao: Date
}

export interface VendaRaw {
  data: string
  campanha: string
  conjunto: string
  criativo: string
  valor: number
  cupom: string
  origem: string
  produto: string
  cliente: string
  status: string
}

export interface Venda extends Omit<VendaRaw, 'data'> {
  data: Date
}

export function parseLead(raw: LeadRaw): Lead {
  return { ...raw, dataEntrada: new Date(raw.dataEntrada), ultimaAtualizacao: new Date(raw.ultimaAtualizacao) }
}

export function parseVenda(raw: VendaRaw): Venda {
  return { ...raw, data: new Date(raw.data) }
}

// ---- Fonte normalization ----

const FONTE_MAP: Record<string, string> = {
  meta_ads: 'Meta Ads', google_ads: 'Google Ads', google: 'Google Ads',
  instagram_bio_sp: 'Instagram', instagram: 'Instagram',
  youtube: 'YouTube', tiktok: 'TikTok', manychat: 'ManyChat',
}

function normalizeFonte(raw: string): string {
  const cleaned = raw.replace(/\{\{.*?\}\}/g, '').replace(/utm_\w+=\s*/gi, '').trim()
  if (!cleaned) return 'Orgânico'
  return FONTE_MAP[cleaned.toLowerCase()] ?? cleaned
}

const ETAPA_VALIDA = /^[A-Za-zÀ-ú\s\-_/]+$/

// ---- Métricas ----

export interface Metrics {
  totalLeads: number
  leadsHoje: number
  leadsSemana: number
  leadsMes: number
  porPipeline: { name: string; value: number }[]
  porEtapa: { name: string; value: number }[]
  porFonte: { name: string; value: number; pct: number }[]
  porCidade: { name: string; value: number }[]
  porDia: { data: string; leads: number; vendas: number }[]
  pipelines: string[]
  // Vendas
  totalVendas: number
  faturamentoTotal: number
  vendasHoje: number
  faturamentoHoje: number
  vendasSemana: number
  vendasMes: number
  faturamentoMes: number
  ticketMedio: number
  taxaConversao: number
  vendasPorFonte: { name: string; value: number; receita: number }[]
}

function toArr(m: Record<string, number>) {
  return Object.entries(m).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }))
}

export function computeMetrics(leads: Lead[], vendas: Venda[], now = new Date()): Metrics {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfDay.getTime() - 6 * 86400000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Leads
  const leadsHoje = leads.filter(l => l.dataEntrada >= startOfDay).length
  const leadsSemana = leads.filter(l => l.dataEntrada >= startOfWeek).length
  const leadsMes = leads.filter(l => l.dataEntrada >= startOfMonth).length

  const pipelineMap: Record<string, number> = {}
  const etapaMap: Record<string, number> = {}
  const fonteMap: Record<string, number> = {}
  const cidadeMap: Record<string, number> = {}
  const diaLeadsMap: Record<string, number> = {}

  for (const lead of leads) {
    const pipeline = lead.pipeline || 'Sem pipeline'
    pipelineMap[pipeline] = (pipelineMap[pipeline] || 0) + 1

    const etapa = lead.etapa?.trim()
    if (etapa && ETAPA_VALIDA.test(etapa)) etapaMap[etapa] = (etapaMap[etapa] || 0) + 1

    fonteMap[normalizeFonte(lead.utmSource || '')] = (fonteMap[normalizeFonte(lead.utmSource || '')] || 0) + 1

    if (lead.cidade?.trim()) cidadeMap[lead.cidade.trim()] = (cidadeMap[lead.cidade.trim()] || 0) + 1

    if (lead.dataEntrada.getFullYear() > 2000) {
      const k = lead.dataEntrada.toISOString().split('T')[0]
      diaLeadsMap[k] = (diaLeadsMap[k] || 0) + 1
    }
  }

  // Vendas
  const vendasHoje = vendas.filter(v => v.data >= startOfDay).length
  const vendasSemana = vendas.filter(v => v.data >= startOfWeek).length
  const vendasMes = vendas.filter(v => v.data >= startOfMonth).length
  const faturamentoTotal = vendas.reduce((s, v) => s + v.valor, 0)
  const faturamentoHoje = vendas.filter(v => v.data >= startOfDay).reduce((s, v) => s + v.valor, 0)
  const faturamentoMes = vendas.filter(v => v.data >= startOfMonth).reduce((s, v) => s + v.valor, 0)
  const ticketMedio = vendas.length > 0 ? faturamentoTotal / vendas.length : 0

  const diaVendasMap: Record<string, number> = {}
  const fonteVendasMap: Record<string, { count: number; receita: number }> = {}
  for (const venda of vendas) {
    if (venda.data.getFullYear() > 2000) {
      const k = venda.data.toISOString().split('T')[0]
      diaVendasMap[k] = (diaVendasMap[k] || 0) + 1
    }
    const src = normalizeFonte(venda.origem || '')
    if (!fonteVendasMap[src]) fonteVendasMap[src] = { count: 0, receita: 0 }
    fonteVendasMap[src].count++
    fonteVendasMap[src].receita += venda.valor
  }

  const porFonteArr = toArr(fonteMap)
  const total = leads.length

  // Combina dias de leads e vendas
  const allDays = new Set([...Object.keys(diaLeadsMap), ...Object.keys(diaVendasMap)])
  const porDia = Array.from(allDays)
    .sort()
    .slice(-30)
    .map(k => ({
      data: k.split('-').reverse().join('/').slice(0, 5),
      leads: diaLeadsMap[k] || 0,
      vendas: diaVendasMap[k] || 0,
    }))

  return {
    totalLeads: total,
    leadsHoje, leadsSemana, leadsMes,
    porPipeline: toArr(pipelineMap),
    porEtapa: toArr(etapaMap),
    porFonte: porFonteArr.map(f => ({ ...f, pct: total > 0 ? Math.round((f.value / total) * 100) : 0 })),
    porCidade: toArr(cidadeMap).slice(0, 6),
    porDia,
    pipelines: toArr(pipelineMap).map(p => p.name),
    totalVendas: vendas.length,
    faturamentoTotal,
    vendasHoje,
    faturamentoHoje,
    vendasSemana,
    vendasMes,
    faturamentoMes,
    ticketMedio,
    taxaConversao: total > 0 ? (vendas.length / total) * 100 : 0,
    vendasPorFonte: Object.entries(fonteVendasMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([name, d]) => ({ name, value: d.count, receita: d.receita })),
  }
}

// ---- Filtros ----

export type DateRange = 'hoje' | '7d' | '30d' | 'mes' | 'custom' | 'tudo'

export interface FilterState {
  dateRange: DateRange
  pipeline: string
  customStart: string // ISO yyyy-mm-dd
  customEnd: string
}

export function filterLeads(leads: Lead[], f: FilterState, now = new Date()): Lead[] {
  const cutoff = getCutoff(f, now)
  const end = f.dateRange === 'custom' && f.customEnd ? new Date(f.customEnd + 'T23:59:59') : null
  return leads.filter(l => {
    if (cutoff && l.dataEntrada < cutoff) return false
    if (end && l.dataEntrada > end) return false
    if (f.pipeline !== 'todos' && l.pipeline !== f.pipeline) return false
    return true
  })
}

export function filterVendas(vendas: Venda[], f: FilterState, now = new Date()): Venda[] {
  const cutoff = getCutoff(f, now)
  const end = f.dateRange === 'custom' && f.customEnd ? new Date(f.customEnd + 'T23:59:59') : null
  return vendas.filter(v => {
    if (cutoff && v.data < cutoff) return false
    if (end && v.data > end) return false
    return true
  })
}

function getCutoff(f: FilterState, now: Date): Date | null {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (f.dateRange === 'hoje') return startOfDay
  if (f.dateRange === '7d') return new Date(startOfDay.getTime() - 6 * 86400000)
  if (f.dateRange === '30d') return new Date(startOfDay.getTime() - 29 * 86400000)
  if (f.dateRange === 'mes') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (f.dateRange === 'custom' && f.customStart) return new Date(f.customStart)
  return null
}
