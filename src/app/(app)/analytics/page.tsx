'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { QuarterlyComparisonChart } from '@/components/dashboard/QuarterlyComparisonChart'
import { QuarterlyChangeCards } from '@/components/dashboard/QuarterlyChangeCards'
import { YoYChart, type YoYPoint } from '@/components/dashboard/YoYChart'
import { TargetGaugeChart, type TargetData } from '@/components/dashboard/TargetGaugeChart'
import { WaterfallChart, type WaterfallPoint } from '@/components/dashboard/WaterfallChart'
import { RevenueKpiCards } from '@/components/dashboard/RevenueKpiCards'
import { ChartColorDialog } from '@/components/dashboard/ChartColorDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useChartColors } from '@/lib/hooks/useChartColors'

interface RawRecord {
  sold_at: string
  sale_price: number
  quantity: number
  unit_cost: number
  fee_1: number
  fee_2: number
  fee_3: number
  ad_cost: number
}

interface QuarterlyPoint {
  quarter: string
  sales: number
  margin: number
}

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

function getQuarterKey(dateStr: string): string {
  const d = new Date(dateStr)
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `${d.getFullYear()} Q${q}`
}

function computeQuarterly(records: RawRecord[]) {
  const quarterMap = new Map<string, { sales: number; margin: number }>()

  for (const r of records) {
    const qty = r.quantity ?? 0
    const sales = (r.sale_price ?? 0) * qty
    const allCost = ((r.unit_cost ?? 0) + (r.fee_1 ?? 0) + (r.fee_2 ?? 0) + (r.fee_3 ?? 0) + (r.ad_cost ?? 0)) * qty
    const margin = sales - allCost

    const qKey = getQuarterKey(r.sold_at)
    const existing = quarterMap.get(qKey) ?? { sales: 0, margin: 0 }
    quarterMap.set(qKey, { sales: existing.sales + sales, margin: existing.margin + margin })
  }

  const quarterlyData: QuarterlyPoint[] = Array.from(quarterMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([quarter, v]) => ({ quarter, ...v }))

  let changeData: QuarterlyChangeData | null = null
  if (quarterlyData.length >= 2) {
    const curr = quarterlyData[quarterlyData.length - 1]
    const prev = quarterlyData[quarterlyData.length - 2]
    const salesChangeRate = prev.sales !== 0
      ? Math.round(((curr.sales - prev.sales) / prev.sales) * 1000) / 10
      : 0
    const marginChangeRate = prev.margin !== 0
      ? Math.round(((curr.margin - prev.margin) / Math.abs(prev.margin)) * 1000) / 10
      : 0
    changeData = {
      currentQuarter: curr.quarter,
      previousQuarter: prev.quarter,
      currentSales: curr.sales,
      previousSales: prev.sales,
      currentMargin: curr.margin,
      previousMargin: prev.margin,
      salesChangeRate,
      marginChangeRate,
    }
  }

  return { quarterlyData, changeData }
}

export default function AnalyticsPage() {
  const { colors, setColors } = useChartColors('analytics')
  const [colorDialogOpen, setColorDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyPoint[]>([])
  const [quarterlyChange, setQuarterlyChange] = useState<QuarterlyChangeData | null>(null)
  const [yoyData, setYoyData] = useState<YoYPoint[]>([])
  const [targetData, setTargetData] = useState<TargetData | null>(null)
  const [waterfallData, setWaterfallData] = useState<WaterfallPoint[]>([])
  const [waterfallYear, setWaterfallYear] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1

      // 분기별 데이터
      const { data: records } = await supabase
        .from('sales_records')
        .select('sold_at, sale_price, quantity, unit_cost, fee_1, fee_2, fee_3, ad_cost')

      if (records && records.length > 0) {
        const result = computeQuarterly(records as RawRecord[])
        setQuarterlyData(result.quarterlyData)
        setQuarterlyChange(result.changeData)
      }

      // YoY 데이터
      const { data: yoy } = await supabase
        .from('revenue_yoy')
        .select('*')

      if (yoy && yoy.length > 0) {
        setYoyData(yoy as YoYPoint[])
      }

      // 목표 대비 (현재 월)
      const { data: target } = await supabase
        .from('revenue_vs_target')
        .select('*')
        .eq('year', currentYear)
        .eq('month', currentMonth)

      if (target && target.length > 0) {
        const totalAmount = target.reduce((s: number, r: Record<string, number>) => s + (r.total_amount ?? 0), 0)
        const totalTarget = target.reduce((s: number, r: Record<string, number>) => s + (r.target_amount ?? 0), 0)
        setTargetData({
          year: currentYear,
          month: currentMonth,
          total_amount: totalAmount,
          target_amount: totalTarget,
          achievement_rate: totalTarget > 0
            ? Math.round((totalAmount / totalTarget) * 10000) / 100
            : 0,
        })
      }

      // 워터폴 데이터
      const { data: waterfall } = await supabase
        .from('revenue_waterfall')
        .select('*')
        .eq('year', currentYear)

      if (waterfall && waterfall.length > 0) {
        setWaterfallData(waterfall as WaterfallPoint[])
        setWaterfallYear(currentYear)
      }

      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    )
  }

  const hasQuarterly = quarterlyData.length > 0
  const hasYoy = yoyData.length > 0
  const empty = !hasQuarterly && !hasYoy

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <ChartColorDialog
        page="analytics"
        open={colorDialogOpen}
        onOpenChange={setColorDialogOpen}
        colors={colors}
        onApply={setColors}
      />

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">매출 분석</h1>
        <button
          onClick={() => setColorDialogOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors group"
          title="차트 색상 설정"
        >
          <span className="material-symbols-outlined text-lg text-primary">palette</span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">색상변경</span>
        </button>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-1">
          <p className="text-lg text-purple-800"><span className="font-bold">분석할</span> 데이터가 없습니다.</p>
          <p className="text-lg text-purple-800">판매데이터를 먼저 등록해주세요.</p>
        </div>
      ) : (
        <>
          {/* 분기별 비교 섹션 */}
          {hasQuarterly && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">분기별 비교</h2>

              {quarterlyChange && (
                <QuarterlyChangeCards data={quarterlyChange} />
              )}

              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader className="px-5 py-3 bg-muted/50 rounded-t-2xl border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">분기별 매출 / 마진 추이</CardTitle>
                    <div className="flex gap-4 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
                        <span>매출</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.secondary }} />
                        <span>마진</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <QuarterlyComparisonChart data={quarterlyData} colors={colors} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* 연간 분석 섹션 */}
          {hasYoy && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">연간 분석</h2>

              <RevenueKpiCards data={yoyData} year={waterfallYear} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border border-border/60 shadow-sm">
                  <CardHeader className="px-5 py-3 bg-muted/50 rounded-t-2xl border-b border-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">연간 매출 비교 (YoY)</CardTitle>
                      <div className="flex gap-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.tertiary }} />
                          <span>전년</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
                          <span>당년</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <YoYChart data={yoyData} colors={{ primary: colors.primary, tertiary: colors.tertiary }} />
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-border/60 shadow-sm">
                  <CardHeader className="px-5 py-3 bg-muted/50 rounded-t-2xl border-b border-border">
                    <CardTitle className="text-sm font-bold">목표 대비 달성률</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TargetGaugeChart data={targetData} />
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border border-border/60 shadow-sm">
                <CardHeader className="px-5 py-3 bg-muted/50 rounded-t-2xl border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">매출 성장 워터폴 ({waterfallYear}년)</CardTitle>
                    <div className="flex gap-4 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-primary" />
                        <span>총액</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                        <span>성장</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                        <span>감소</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <WaterfallChart data={waterfallData} year={waterfallYear} />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
