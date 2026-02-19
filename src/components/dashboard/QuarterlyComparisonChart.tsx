'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface QuarterlyPoint {
  quarter: string
  sales: number
  margin: number
}

export function QuarterlyComparisonChart({ data }: { data: QuarterlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 10000).toFixed(0) + '만'} />
        <Tooltip formatter={(v) => Number(v).toLocaleString('ko-KR') + '원'} />
        <Bar dataKey="sales" name="매출" fill="#7c3aed" radius={[4, 4, 0, 0]} />
        <Bar dataKey="margin" name="마진" fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
