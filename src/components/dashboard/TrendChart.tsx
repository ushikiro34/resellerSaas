'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TrendPoint {
  date: string
  sales: number
  margin: number
}

export function TrendChart({
  data,
  onDrilldown,
}: {
  data: TrendPoint[]
  onDrilldown?: (date: string) => void
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        style={onDrilldown ? { cursor: 'pointer' } : undefined}
        onClick={(e) => {
          if (onDrilldown && e?.activePayload?.[0]) {
            onDrilldown(e.activePayload[0].payload.date)
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 10000).toFixed(0) + '만'} />
        <Tooltip formatter={(v: number) => v.toLocaleString('ko-KR') + '원'} />
        <Legend />
        <Line type="monotone" dataKey="sales" name="매출" stroke="#7c3aed" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="margin" name="마진" stroke="#10b981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}