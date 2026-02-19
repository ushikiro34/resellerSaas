'use client'

import type { YoYPoint } from './YoYChart'

function fmt(v: number) {
  return v.toLocaleString('ko-KR') + '원'
}

function RevenueCard({
  title,
  current,
  previous,
  yoyPercent,
  icon,
  iconColor,
}: {
  title: string
  current: number
  previous: number
  yoyPercent: number
  icon: string
  iconColor: string
}) {
  const isPositive = yoyPercent >= 0
  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className={`material-symbols-outlined text-xl ${iconColor}`}>{icon}</span>
      </div>
      <span className="text-2xl font-bold">{fmt(current)}</span>
      <div className="flex items-center gap-2 mt-1">
        <span
          className={`material-symbols-outlined text-base ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
        >
          {isPositive ? 'trending_up' : 'trending_down'}
        </span>
        <span
          className={`text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
        >
          {isPositive ? '+' : ''}{yoyPercent}%
        </span>
        <span className="text-xs text-muted-foreground">
          전년 {fmt(previous)}
        </span>
      </div>
    </div>
  )
}

export function RevenueKpiCards({ data, year }: { data: YoYPoint[]; year: number }) {
  const yearData = data.filter((d) => d.year === year)

  if (yearData.length === 0) return null

  const totalCurrent = yearData.reduce((s, d) => s + d.current_year, 0)
  const totalPrevious = yearData.reduce((s, d) => s + d.previous_year, 0)
  const totalYoyPercent = totalPrevious > 0
    ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 1000) / 10
    : 0

  const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
    product: { label: '상품 매출', icon: 'inventory_2', color: 'text-primary' },
    subscription: { label: '구독 매출', icon: 'subscriptions', color: 'text-cyan-500' },
    ads: { label: '광고 매출', icon: 'ads_click', color: 'text-amber-500' },
  }

  // 유형별 합산 (region 통합)
  const byType = yearData.reduce<Record<string, { current: number; previous: number }>>((acc, d) => {
    if (!acc[d.revenue_type]) acc[d.revenue_type] = { current: 0, previous: 0 }
    acc[d.revenue_type].current += d.current_year
    acc[d.revenue_type].previous += d.previous_year
    return acc
  }, {})

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <RevenueCard
        title={`${year}년 총 매출`}
        current={totalCurrent}
        previous={totalPrevious}
        yoyPercent={totalYoyPercent}
        icon="payments"
        iconColor="text-primary"
      />
      {Object.entries(byType).map(([type, vals]) => {
        const meta = typeLabels[type] ?? { label: type, icon: 'category', color: 'text-muted-foreground' }
        const pct = vals.previous > 0
          ? Math.round(((vals.current - vals.previous) / vals.previous) * 1000) / 10
          : 0
        return (
          <RevenueCard
            key={type}
            title={meta.label}
            current={vals.current}
            previous={vals.previous}
            yoyPercent={pct}
            icon={meta.icon}
            iconColor={meta.color}
          />
        )
      })}
    </div>
  )
}
