'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export interface TargetData {
  year: number
  month: number
  total_amount: number
  target_amount: number
  achievement_rate: number
}

export function TargetGaugeChart({ data }: { data: TargetData | null }) {
  if (!data || data.target_amount === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        목표가 설정되지 않았습니다
      </div>
    )
  }

  const rate = Math.min(data.achievement_rate, 200)
  const gaugeValue = Math.min(rate, 100)
  const remaining = 100 - gaugeValue

  const pieData = [
    { name: '달성', value: gaugeValue },
    { name: '미달', value: remaining },
  ]

  const color = rate >= 100 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="60%"
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={110}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
        <span className="text-3xl font-bold" style={{ color }}>
          {data.achievement_rate}%
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          {data.total_amount.toLocaleString('ko-KR')}원 / {data.target_amount.toLocaleString('ko-KR')}원
        </span>
        <span className="text-xs text-muted-foreground">
          {data.year}년 {data.month}월
        </span>
      </div>
    </div>
  )
}
