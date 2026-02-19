interface QuarterlyChangeData {
  currentQuarter: string
  previousQuarter: string
  currentSales: number
  previousSales: number
  currentMargin: number
  previousMargin: number
  salesChangeRate: number
  marginChangeRate: number
}

function fmt(v: number) {
  return v.toLocaleString('ko-KR') + '원'
}

function ChangeCard({
  title,
  current,
  changeRate,
  currentQ,
  prevQ,
}: {
  title: string
  current: number
  changeRate: number
  currentQ: string
  prevQ: string
}) {
  const isPositive = changeRate >= 0
  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span
          className={`material-symbols-outlined text-xl ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
        >
          {isPositive ? 'trending_up' : 'trending_down'}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold">{fmt(current)}</span>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
          >
            {isPositive ? '+' : ''}{changeRate}%
          </span>
          <span className="text-xs text-muted-foreground">
            vs {prevQ}
          </span>
        </div>
        <span className="text-xs text-muted-foreground mt-0.5">{currentQ}</span>
      </div>
    </div>
  )
}

export function QuarterlyChangeCards({ data }: { data: QuarterlyChangeData }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ChangeCard
        title="분기 매출"
        current={data.currentSales}
        changeRate={data.salesChangeRate}
        currentQ={data.currentQuarter}
        prevQ={data.previousQuarter}
      />
      <ChangeCard
        title="분기 마진"
        current={data.currentMargin}
        changeRate={data.marginChangeRate}
        currentQ={data.currentQuarter}
        prevQ={data.previousQuarter}
      />
    </div>
  )
}
