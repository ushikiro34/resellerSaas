'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface CostSlice {
  name: string
  value: number
}

const DEFAULT_COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe']

export function CostPieChart({ data, colors }: { data: CostSlice[]; colors?: string[] }) {
  const palette = colors ?? DEFAULT_COLORS
  const total = data.reduce((s, d) => s + d.value, 0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const activeItem = activeIndex !== null ? data[activeIndex] : null

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
      <div className="relative w-56 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              dataKey="value"
              strokeWidth={0}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={palette[i % palette.length]}
                  style={{
                    transform: activeIndex === i ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'transform 0.2s ease',
                    opacity: activeIndex !== null && activeIndex !== i ? 0.6 : 1,
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {activeItem ? (
            <>
              <span className="text-xs text-muted-foreground">{activeItem.name}</span>
              <span className="text-lg font-bold">
                {total > 0 ? Math.round((activeItem.value / total) * 100) : 0}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {activeItem.value.toLocaleString('ko-KR')}원
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">총 비용</span>
              <span className="text-lg font-bold">{total.toLocaleString('ko-KR')}원</span>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between w-48 px-2 py-1 rounded-md transition-colors cursor-default ${
              activeIndex === i ? 'bg-muted' : ''
            }`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: palette[i % palette.length] }}
              />
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <span className="text-sm font-bold">
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
