'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from 'recharts'
import {
  Users, UserCheck, TrendingUp, Calendar, RefreshCw, Activity,
  Filter, ChevronDown, DollarSign, ShoppingCart, Percent, BarChart2,
} from 'lucide-react'
import { KPICard } from './KPICard'
import {
  type LeadRaw, type VendaRaw, type Lead, type Venda, type FilterState,
  parseLead, parseVenda, computeMetrics, filterLeads, filterVendas,
} from '@/lib/metrics'

const DATE_OPTIONS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Este mês', value: 'mes' },
  { label: 'Personalizado', value: 'custom' },
  { label: 'Tudo', value: 'tudo' },
]

const PALETTE = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1']

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtR = (n: number) => `R$ ${fmt(n)}`

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: { label: string; value: string }[]; placeholder?: string
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm text-gray-700 cursor-pointer hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors">
        {placeholder && <option value="todos">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        className="border border-gray-200 rounded-xl px-2.5 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" />
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1">
      <p className="text-gray-400 font-medium mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name === 'vendas' ? `${p.value} vendas` : `${p.value} leads`}
        </p>
      ))}
    </div>
  )
}

function topWithOthers(arr: { name: string; value: number }[], n = 7) {
  if (arr.length <= n) return arr
  const outros = arr.slice(n).reduce((s, i) => s + i.value, 0)
  return [...arr.slice(0, n), { name: 'Outros', value: outros }]
}

const DEFAULT_FILTER: FilterState = { dateRange: 'tudo', pipeline: 'todos', customStart: '', customEnd: '' }

export default function Dashboard() {
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [allVendas, setAllVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER)

  const setF = (patch: Partial<FilterState>) => setFilter(f => ({ ...f, ...patch }))

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/leads', { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro')
      const json = await res.json()
      setAllLeads((json.leads as LeadRaw[]).map(parseLead))
      setAllVendas((json.vendas as VendaRaw[]).map(parseVenda))
      setLastUpdate(new Date())
      setRefreshCount(c => c + 1)
    } catch {
      setError('Não foi possível carregar os dados da planilha.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [fetchData])

  const filtered = useMemo(() => ({
    leads: filterLeads(allLeads, filter),
    vendas: filterVendas(allVendas, filter),
  }), [allLeads, allVendas, filter])

  const m = useMemo(() => computeMetrics(filtered.leads, filtered.vendas), [filtered])

  const pipelineOptions = useMemo(
    () => computeMetrics(allLeads, allVendas).pipelines.map(p => ({ label: p, value: p })),
    [allLeads, allVendas]
  )

  const pipelineTop = topWithOthers(m.porPipeline)
  const etapaTop = m.porEtapa.slice(0, 8)
  const isFiltered = filter.dateRange !== 'tudo' || filter.pipeline !== 'todos'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm font-medium">Carregando dados...</p>
        <p className="text-gray-400 text-xs mt-1">Buscando todos os leads da planilha</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-sm text-center">
        <p className="text-red-600 font-semibold mb-2">Erro ao carregar</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={fetchData} className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors">
          Tentar novamente
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-gray-900">Dr. Danilo Matsunaga</h1>
              <p className="text-xs text-gray-400">Dashboard de Leads & Vendas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="hidden sm:block text-xs text-gray-400">
                Atualizado às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                {refreshCount > 1 && <span className="text-emerald-500 ml-1">· #{refreshCount}</span>}
              </span>
            )}
            <button onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mr-1">
            <Filter className="w-3 h-3" />
            Filtros:
          </div>
          <Select value={filter.dateRange} onChange={v => setF({ dateRange: v as FilterState['dateRange'] })} options={DATE_OPTIONS} />
          {filter.dateRange === 'custom' && (
            <>
              <DateInput label="De" value={filter.customStart} onChange={v => setF({ customStart: v })} />
              <DateInput label="Até" value={filter.customEnd} onChange={v => setF({ customEnd: v })} />
            </>
          )}
          <Select value={filter.pipeline} onChange={v => setF({ pipeline: v })} options={pipelineOptions} placeholder="Todos os pipelines" />
          {isFiltered && (
            <button onClick={() => setFilter(DEFAULT_FILTER)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2">
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            <span className="font-semibold text-gray-700">{m.totalLeads.toLocaleString('pt-BR')}</span> leads
            {' · '}
            <span className="font-semibold text-gray-700">{m.totalVendas}</span> vendas
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">

        {/* KPIs Leads */}
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Leads</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total de Leads" value={m.totalLeads.toLocaleString('pt-BR')} subtitle="No período" icon={<Users className="w-4 h-4" />} color="green" />
            <KPICard title="Leads Hoje" value={m.leadsHoje} subtitle="Desde meia-noite" icon={<Calendar className="w-4 h-4" />} color="blue" />
            <KPICard title="Esta Semana" value={m.leadsSemana} subtitle="Últimos 7 dias" icon={<TrendingUp className="w-4 h-4" />} color="purple" />
            <KPICard title="Este Mês" value={m.leadsMes} subtitle={new Date().toLocaleDateString('pt-BR', { month: 'long' })} icon={<UserCheck className="w-4 h-4" />} color="amber" />
          </div>
        </div>

        {/* KPIs Vendas */}
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Vendas Kiwify</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Faturamento Total" value={fmtR(m.faturamentoTotal)} subtitle={`${m.totalVendas} vendas no período`} icon={<DollarSign className="w-4 h-4" />} color="green" />
            <KPICard title="Faturamento Hoje" value={fmtR(m.faturamentoHoje)} subtitle={`${m.vendasHoje} vendas`} icon={<ShoppingCart className="w-4 h-4" />} color="blue" />
            <KPICard title="Faturamento do Mês" value={fmtR(m.faturamentoMes)} subtitle={`${m.vendasMes} vendas`} icon={<BarChart2 className="w-4 h-4" />} color="purple" />
            <KPICard title="Taxa de Conversão" value={`${m.taxaConversao.toFixed(2)}%`} subtitle={`Ticket médio: ${fmtR(m.ticketMedio)}`} icon={<Percent className="w-4 h-4" />} color="amber" />
          </div>
        </div>

        {/* Gráfico combinado */}
        {m.porDia.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Leads & Vendas por Dia</h2>
                <p className="text-xs text-gray-400 mt-0.5">Últimos 30 dias</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />Leads</span>
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />Vendas</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={m.porDia} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="leads" name="leads" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 2, strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="vendas" name="vendas" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 2, strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pipeline + Etapas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Por Pipeline</h2>
            <p className="text-xs text-gray-400 mb-5">Volume por funil de atendimento</p>
            <ResponsiveContainer width="100%" height={Math.max(200, pipelineTop.length * 36)}>
              <BarChart data={pipelineTop} layout="vertical" margin={{ left: 4, right: 40 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={160} />
                <Tooltip formatter={(v) => [`${v} leads`, '']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {pipelineTop.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Por Etapa</h2>
            <p className="text-xs text-gray-400 mb-5">Posição dos leads no funil</p>
            {etapaTop.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem dados</div>
            ) : (
              <div className="space-y-2.5">
                {etapaTop.map((item, i) => {
                  const pct = m.totalLeads > 0 ? (item.value / m.totalLeads) * 100 : 0
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium truncate pr-2 max-w-[60%]">{item.name}</span>
                        <span className="text-gray-400 shrink-0">{item.value} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Origem Leads + Origem Vendas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Origem dos Leads</h2>
            <p className="text-xs text-gray-400 mb-5">Canal de aquisição (UTM Source)</p>
            <div className="space-y-3">
              {m.porFonte.map((item, i) => (
                <div key={item.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-gray-400">{item.value} ({item.pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Origem Vendas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Origem das Vendas</h2>
            <p className="text-xs text-gray-400 mb-5">Faturamento por canal</p>
            {m.vendasPorFonte.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem vendas no período</div>
            ) : (
              <div className="space-y-3">
                {m.vendasPorFonte.map((item, i) => {
                  const maxReceita = Math.max(...m.vendasPorFonte.map(v => v.receita))
                  const pct = maxReceita > 0 ? (item.receita / maxReceita) * 100 : 0
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{item.name || 'Orgânico'}</span>
                        <span className="text-gray-400">{item.value} vendas · {fmtR(item.receita)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Cidades */}
        {m.porCidade.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Top Cidades</h2>
            <p className="text-xs text-gray-400 mb-5">Leads com cidade identificada</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={m.porCidade} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={28} />
                <Tooltip formatter={(v) => [`${v} leads`, '']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={40}>
                  {m.porCidade.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-2">
          Sincronizado a cada 5 min · Sem custo de API · Dr. Danilo Matsunaga © 2026
          {allLeads.length < allLeads.length + 1 && (
            <span className="ml-2 text-amber-500">
              · Exibindo {allLeads.length} leads (aba &quot;Leads Consulta&quot; exporta os mais recentes)
            </span>
          )}
        </p>
      </main>
    </div>
  )
}
