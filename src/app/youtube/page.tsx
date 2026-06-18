'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Activity, Play, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react'
import Link from 'next/link'
interface VendaRaw {
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

interface Venda {
  data: Date
  cliente: string
  valor: number
  origem: string
  status: string
}

const fmtR = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fmtHora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function KPI({ title, value, sub, icon, color }: { title: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-500 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400 font-medium">{title}</p>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function PlayPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/leads', { cache: 'no-store' })
      const json = await res.json()
      const todas = (json.vendas as VendaRaw[])
        .map(v => ({ ...v, data: new Date(v.data) })) as Venda[]
      const youtube = todas.filter(v =>
        ['youtube_info', 'youtube'].includes((v.origem || '').toLowerCase().trim())
      )
      setVendas(youtube)
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [fetchData])

  const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const startOfDay = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate()) + 3 * 60 * 60 * 1000)
  const startOfMonth = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), 1) + 3 * 60 * 60 * 1000)

  const total = vendas.length
  const receita = vendas.reduce((s, v) => s + v.valor, 0)
  const hoje = vendas.filter(v => v.data >= startOfDay).length
  const mes = vendas.filter(v => v.data >= startOfMonth).length
  const receitaMes = vendas.filter(v => v.data >= startOfMonth).reduce((s, v) => s + v.valor, 0)
  const ticket = total > 0 ? receita / total : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-gray-900">YouTube Orgânico</h1>
              <p className="text-xs text-gray-400">Vendas via canal Dr. Danilo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-all">
              <Activity className="w-3 h-3" />
              Dashboard principal
            </Link>
            {lastUpdate && (
              <span className="hidden sm:block text-xs text-gray-400">
                {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI title="Total de Vendas" value={String(total)} sub="Todas as épocas" icon={<ShoppingCart className="w-4 h-4" />} color="red" />
          <KPI title="Receita Total" value={fmtR(receita)} sub={`Ticket médio ${fmtR(ticket)}`} icon={<DollarSign className="w-4 h-4" />} color="green" />
          <KPI title="Vendas Hoje" value={String(hoje)} sub="Desde meia-noite" icon={<TrendingUp className="w-4 h-4" />} color="blue" />
          <KPI title="Este Mês" value={String(mes)} sub={fmtR(receitaMes)} icon={<Play className="w-4 h-4" />} color="amber" />
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Clientes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Todas as compras via YouTube orgânico</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : vendas.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">Nenhuma venda encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">#</th>
                    <th className="text-left px-5 py-3 font-medium">Cliente</th>
                    <th className="text-left px-5 py-3 font-medium">Data</th>
                    <th className="text-left px-5 py-3 font-medium">Hora</th>
                    <th className="text-right px-5 py-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas
                    .sort((a, b) => b.data.getTime() - a.data.getTime())
                    .map((v, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 text-gray-300 text-xs">{vendas.length - i}</td>
                        <td className="px-5 py-3.5 font-medium text-gray-800">{v.cliente || '—'}</td>
                        <td className="px-5 py-3.5 text-gray-500">{fmtData(v.data)}</td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtHora(v.data)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">{fmtR(v.valor)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-100 bg-gray-50">
                    <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">{fmtR(receita)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">
          Sincronizado a cada 5 min · Dr. Danilo Matsunaga © 2026
        </p>
      </main>
    </div>
  )
}
