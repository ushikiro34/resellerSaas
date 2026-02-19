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
} from 'recharts'

export interface YoYPoint {
  year: number
  revenue_type: string
  current_year: number
  previous_year: number
  yoy_diff: number
  yoy_percent: number
}

export function YoYChart({ data }: { data: YoYPoint[] }) {
  // revenue_type별로 그룹핑하여 연도별 비교
  const grouped = data.reduce<Record<number, { year: number; current: number; previous: number; yoy_percent: number }>>((acc, d) => {
    if (!acc[d.year]) {
      acc[d.year] = { year: d.year, current: 0, previous: 0, yoy_percent: 0 }
    }
    acc[d.year].current += d.current_year
    acc[d.year].previous += d.previous_year
    return acc
  }, {})

  const chartData = Object.values(grouped)
    .sort((a, b) => a.year - b.year)
    .map((d) => ({
      ...d,
      yoy_percent: d.previous > 0
        ? Math.round(((d.current - d.previous) / d.previous) * 1000) / 10
        : 0,
    }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 10000).toFixed(0) + '만'} />
        <Tooltip
          formatter={(v, name) => [
            Number(v).toLocaleString('ko-KR') + '원',
            name === 'previous' ? '전년' : '당년',
          ]}
          labelFormatter={(label) => `${label}년`}
        />
        <Bar dataKey="previous" name="전년" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
        <Bar dataKey="current" name="당년" fill="#7c3aed" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.yoy_percent >= 0 ? '#7c3aed' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
