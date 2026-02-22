'use client'

import { Suspense, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesGrid, type SalesRecord } from '@/components/grid/SalesGrid'
import { ExcelUpload } from '@/components/grid/ExcelUpload'
import { ManualInput } from '@/components/grid/ManualInput'
import { Button } from '@/components/ui/button'

export default function GridPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><p className="text-muted-foreground">불러오는 중...</p></div>}>
      <GridContent />
    </Suspense>
  )
}

function GridContent() {
  const searchParams = useSearchParams()
  const channelFilter = searchParams.get('channel') ?? ''
  const dateFilter = searchParams.get('date') ?? ''
  const [selectedRows, setSelectedRows] = useState<SalesRecord[]>([])
  const [calendarStatus, setCalendarStatus] = useState('')

  const handleSelectionChange = useCallback((rows: SalesRecord[]) => {
    setSelectedRows(rows)
  }, [])

  const handleCalendar = async () => {
    if (selectedRows.length === 0) return
    setCalendarStatus('등록 중...')
    try {
      const events = selectedRows.map((row) => ({
        summary: `[정산] ${row.product_name}`,
        description: `판매가: ${row.sale_price.toLocaleString()}원 | 마진: ${row.margin.toLocaleString()}원`,
        date: row.settlement_due_at ?? row.sold_at,
      }))

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (result.error === 'NO_GOOGLE_TOKEN' || result.error === 'TOKEN_REFRESH_FAILED') {
          setCalendarStatus('Google 재로그인 필요')
        } else {
          setCalendarStatus('등록 실패')
        }
        return
      }

      setCalendarStatus(`${result.succeeded}건 등록 완료`)
      window.open('https://calendar.google.com', '_blank')
    } catch {
      setCalendarStatus('등록 실패')
    }
    setTimeout(() => setCalendarStatus(''), 3000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">판매 데이터</h1>
          </div>
          <div className="flex items-center gap-3">
            {calendarStatus && (
              <span className="text-sm text-muted-foreground font-medium">{calendarStatus}</span>
            )}
            <Button
              variant="outline"
              className="font-bold flex items-center gap-2 shadow-sm hover:bg-lavender"
              onClick={handleCalendar}
              disabled={selectedRows.length === 0}
            >
              <span className="material-symbols-outlined text-xl">calendar_month</span>
              구글 캘린더{selectedRows.length > 0 ? ` (${selectedRows.length}건)` : ''}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 px-8 pb-0">
        <SalesGrid
          initialChannel={channelFilter}
          initialDate={dateFilter}
          onSelectionChange={handleSelectionChange}
          actionButtons={
            <>
              <ManualInput />
              <ExcelUpload />
            </>
          }
        />
      </div>
    </div>
  )
}