'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CostSlice {
  name: string
  value: number
}

const COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe']

export function CostPieChart({ data }: { data: CostSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v.toLocaleString('ko-KR') + '원', '']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}