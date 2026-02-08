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

interface ChannelPoint {
  channel: string
  sales: number
  margin: number
}

export function ChannelChart({
  data,
  onDrilldown,
}: {
  data: ChannelPoint[]
  onDrilldown?: (channel: string) => void
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        style={onDrilldown ? { cursor: 'pointer' } : undefined}
        onClick={(e) => {
          if (onDrilldown && e?.activePayload?.[0]) {
            onDrilldown(e.activePayload[0].payload.channel)
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 10000).toFixed(0) + '만'} />
        <Tooltip formatter={(v: number) => v.toLocaleString('ko-KR') + '원'} />
        <Bar dataKey="sales" name="매출" fill="#7c3aed" radius={[4, 4, 0, 0]} />
        <Bar dataKey="margin" name="마진" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}