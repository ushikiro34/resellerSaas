'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

export interface WaterfallPoint {
  revenue_type: string
  base_amount: number
  current_amount: number
  growth_amount: number
}

interface WaterfallBar {
  name: string
  value: number
  invisible: number
  isTotal: boolean
}

function buildWaterfallBars(data: WaterfallPoint[], year: number): WaterfallBar[] {
  if (data.length === 0) return []

  const totalBase = data.reduce((s, d) => s + d.base_amount, 0)
  const totalCurrent = data.reduce((s, d) => s + d.current_amount, 0)

  const bars: WaterfallBar[] = [
    { name: `${year - 1}년 매출`, value: totalBase, invisible: 0, isTotal: true },
  ]

  const typeLabels: Record<string, string> = {
    product: '상품',
    subscription: '구독',
    ads: '광고',
  }

  let running = totalBase
  for (const d of data) {
    const growth = d.growth_amount
    bars.push({
      name: `${typeLabels[d.revenue_type] ?? d.revenue_type} 성장`,
      value: growth,
      invisible: growth >= 0 ? running : running + growth,
      isTotal: false,
    })
    running += growth
  }

  bars.push({
    name: `${year}년 매출`,
    value: totalCurrent,
    invisible: 0,
    isTotal: true,
  })

  return bars
}

export function WaterfallChart({ data, year }: { data: WaterfallPoint[]; year: number }) {
  const bars = buildWaterfallBars(data, year)

  if (bars.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
        워터폴 데이터가 없습니다
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={bars}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 10000).toFixed(0) + '만'} />
        <Tooltip
          formatter={(v, name) => {
            if (name === 'invisible') return [null, null]
            return [Number(v).toLocaleString('ko-KR') + '원', '금액']
          }}
        />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <Bar dataKey="invisible" stackId="stack" fill="transparent" />
        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
          {bars.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.isTotal
                  ? '#7c3aed'
                  : entry.value >= 0
                    ? '#10b981'
                    : '#ef4444'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
