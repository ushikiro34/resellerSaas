'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        style={onDrilldown ? { cursor: 'pointer' } : undefined}
        onClick={(e) => {
          const payload = (e as Record<string, unknown>)?.activePayload as Array<{ payload: TrendPoint }> | undefined
          if (onDrilldown && payload?.[0]) {
            onDrilldown(payload[0].payload.date)
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 10000).toFixed(0) + '만'} />
        <Tooltip formatter={(v) => Number(v).toLocaleString('ko-KR') + '원'} />
        <Line type="monotone" dataKey="sales" name="매출" stroke="#7c3aed" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="margin" name="마진" stroke="#06b6d4" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}