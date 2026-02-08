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

interface ProductPoint {
  product: string
  margin: number
}

export function TopProductsChart({ data }: { data: ProductPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 10000).toFixed(0) + '만'} />
        <YAxis type="category" dataKey="product" tick={{ fontSize: 11 }} width={90} />
        <Tooltip formatter={(v: number) => v.toLocaleString('ko-KR') + '원'} />
        <Bar dataKey="margin" name="마진" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}