'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { SalesGrid, type SalesRecord } from '@/components/grid/SalesGrid'
import { ExcelUpload } from '@/components/grid/ExcelUpload'
import { ManualInput } from '@/components/grid/ManualInput'
import { Button } from '@/components/ui/button'

export default function GridPage() {
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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.provider_token
      if (!token) {
        setCalendarStatus('Google 로그인 필요')
        return
      }

      const results = await Promise.allSettled(
        selectedRows.map((row) => {
          const date = row.settlement_due_at ?? row.sold_at
          return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: `[정산] ${row.product_name}`,
              description: `판매가: ${row.sale_price.toLocaleString()}원 | 마진: ${row.margin.toLocaleString()}원`,
              start: { date },
              end: { date },
            }),
          })
        })
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      setCalendarStatus(`${succeeded}건 등록 완료`)
    } catch {
      setCalendarStatus('등록 실패')
    }
    setTimeout(() => setCalendarStatus(''), 3000)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">판매 데이터</h1>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {calendarStatus && (
              <span className="text-xs text-muted-foreground">{calendarStatus}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalendar}
              disabled={selectedRows.length === 0}
            >
              📅 캘린더 등록{selectedRows.length > 0 ? ` (${selectedRows.length}건)` : ''}
            </Button>
          </div>
          <div className="flex gap-2">
            <ManualInput />
            <ExcelUpload />
          </div>
        </div>
      </div>
      <SalesGrid
        initialChannel={channelFilter}
        initialDate={dateFilter}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  )
}