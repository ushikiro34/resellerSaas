interface ProductPoint {
  product: string
  margin: number
}

export function TopProductsChart({ data, colors }: { data: ProductPoint[]; colors?: { positive: string } }) {
  const positiveColor = colors?.positive ?? '#06b6d4'
  const maxAbsMargin = data.length > 0 ? Math.max(...data.map((d) => Math.abs(d.margin))) : 1

  return (
    <div className="space-y-3 py-1">
      {data.map((item, i) => {
        const isNegative = item.margin < 0
        return (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="truncate pr-4">{item.product}</span>
              <span className={`shrink-0 ${isNegative ? 'text-[#f87171]' : ''}`}>
                {item.margin.toLocaleString('ko-KR')}원
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max((Math.abs(item.margin) / maxAbsMargin) * 100, 2)}%`,
                  backgroundColor: isNegative ? '#f87171' : positiveColor,
                }}
              />
            </div>
          </div>
        )
      })}
      {data.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
      )}
    </div>
  )
}
