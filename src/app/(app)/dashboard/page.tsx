'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { ChannelChart } from '@/components/dashboard/ChannelChart'
import { CostPieChart } from '@/components/dashboard/CostPieChart'
import { TopProductsChart } from '@/components/dashboard/TopProductsChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RawRecord {
  product_name: string
  marketplace: string | null
  sold_at: string
  sale_price: number
  quantity: number
  unit_cost: number
  fee_1: number
  fee_2: number
  fee_3: number
  ad_cost: number
}

interface KpiData {
  total_sales: number
  total_fee: number
  total_margin: number
  total_quantity: number
  avg_margin_rate: number
}

type DateRange = '7D' | '30D' | '90D' | 'ALL'

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: '7일', value: '7D' },
  { label: '30일', value: '30D' },
  { label: '90일', value: '90D' },
  { label: '전체', value: 'ALL' },
]

function getFromDate(range: DateRange): string | null {
  if (range === 'ALL') return null
  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function formatKRW(value: number) {
  return value.toLocaleString('ko-KR') + '원'
}

function computeAll(records: RawRecord[]) {
  let total_sales = 0, total_margin = 0, total_fee = 0, total_quantity = 0
  let cost_unit = 0, cost_fee = 0, cost_ad = 0

  const trendMap = new Map<string, { sales: number; margin: number }>()
  const channelMap = new Map<string, { sales: number; margin: number }>()
  const productMap = new Map<string, number>()

  for (const r of records) {
    const qty = r.quantity ?? 0
    const sales = (r.sale_price ?? 0) * qty
    const fee = ((r.fee_1 ?? 0) + (r.fee_2 ?? 0) + (r.fee_3 ?? 0)) * qty
    const allCost = ((r.unit_cost ?? 0) + (r.fee_1 ?? 0) + (r.fee_2 ?? 0) + (r.fee_3 ?? 0) + (r.ad_cost ?? 0)) * qty
    const margin = sales - allCost

    total_sales += sales
    total_fee += fee
    total_margin += margin
    total_quantity += qty
    cost_unit += (r.unit_cost ?? 0) * qty
    cost_fee += fee
    cost_ad += (r.ad_cost ?? 0) * qty

    const date = r.sold_at?.slice(0, 10) ?? ''
    const t = trendMap.get(date) ?? { sales: 0, margin: 0 }
    trendMap.set(date, { sales: t.sales + sales, margin: t.margin + margin })

    const ch = r.marketplace ?? '직접'
    const c = channelMap.get(ch) ?? { sales: 0, margin: 0 }
    channelMap.set(ch, { sales: c.sales + sales, margin: c.margin + margin })

    productMap.set(r.product_name, (productMap.get(r.product_name) ?? 0) + margin)
  }

  const avg_margin_rate = total_sales > 0
    ? Math.round((total_margin / total_sales) * 1000) / 10
    : 0

  const kpi: KpiData = { total_sales, total_fee, total_margin, total_quantity, avg_margin_rate }

  const trendData = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }))

  const channelData = Array.from(channelMap.entries())
    .sort((a, b) => b[1].sales - a[1].sales)
    .map(([channel, v]) => ({ channel, ...v }))

  const costData = [
    { name: '원가', value: cost_unit },
    { name: '수수료', value: cost_fee },
    { name: '광고비', value: cost_ad },
  ].filter((d) => d.value > 0)

  const topProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product, margin]) => ({ product, margin }))

  return { kpi, trendData, channelData, costData, topProducts }
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30D')
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [trendData, setTrendData] = useState<{ date: string; sales: number; margin: number }[]>([])
  const [channelData, setChannelData] = useState<{ channel: string; sales: number; margin: number }[]>([])
  const [costData, setCostData] = useState<{ name: string; value: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ product: string; margin: number }[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const fromDate = getFromDate(dateRange)

      let query = supabase
        .from('sales_records')
        .select('product_name, marketplace, sold_at, sale_price, quantity, unit_cost, fee_1, fee_2, fee_3, ad_cost')

      if (fromDate) {
        query = query.gte('sold_at', fromDate)
      }

      const { data: records } = await query

      if (!records || records.length === 0) {
        setKpi(null)
        setTrendData([])
        setChannelData([])
        setCostData([])
        setTopProducts([])
        setLoading(false)
        return
      }

      const result = computeAll(records as RawRecord[])
      setKpi(result.kpi)
      setTrendData(result.trendData)
      setChannelData(result.channelData)
      setCostData(result.costData)
      setTopProducts(result.topProducts)
      setLoading(false)
    }

    fetchData()
  }, [dateRange])

  const empty = !kpi || kpi.total_quantity === 0

  const handleChannelDrilldown = useCallback((channel: string) => {
    router.push(`/grid?channel=${encodeURIComponent(channel)}`)
  }, [router])

  const handleDateDrilldown = useCallback((date: string) => {
    router.push(`/grid?date=${encodeURIComponent(date)}`)
  }, [router])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="flex gap-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={dateRange === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">불러오는 중...</p>
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-2">
          <p className="text-lg">아직 데이터가 없습니다</p>
          <p className="text-sm">판매 데이터 페이지에서 엑셀을 업로드해주세요</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard title="총 매출" value={formatKRW(kpi.total_sales)} />
            <KpiCard title="총 마진" value={formatKRW(kpi.total_margin)} sub={`마진율 ${kpi.avg_margin_rate}%`} />
            <KpiCard title="총 수수료" value={formatKRW(kpi.total_fee)} />
            <KpiCard title="총 판매수" value={kpi.total_quantity.toLocaleString('ko-KR') + '개'} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">매출 / 마진 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart data={trendData} onDrilldown={handleDateDrilldown} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">판매처별 매출</CardTitle>
              </CardHeader>
              <CardContent>
                <ChannelChart data={channelData} onDrilldown={handleChannelDrilldown} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">비용 구조</CardTitle>
              </CardHeader>
              <CardContent>
                <CostPieChart data={costData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">상품별 마진 TOP 5</CardTitle>
              </CardHeader>
              <CardContent>
                <TopProductsChart data={topProducts} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}