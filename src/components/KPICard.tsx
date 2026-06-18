'use client'

interface KPICardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  trend?: number
  color?: 'green' | 'blue' | 'purple' | 'amber'
}

const colorMap = {
  green: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-100',
  },
  purple: {
    bg: 'bg-violet-50',
    icon: 'bg-violet-500',
    text: 'text-violet-600',
    border: 'border-violet-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-100',
  },
}

export function KPICard({ title, value, subtitle, icon, trend, color = 'green' }: KPICardProps) {
  const c = colorMap[color]
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6 flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`${c.icon} text-white p-2.5 rounded-xl`}>{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <p className={`text-sm mt-1 font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trend}% vs ontem
          </p>
        )}
      </div>
    </div>
  )
}
