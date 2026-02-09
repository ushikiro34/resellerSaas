'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface ExcelRow {
  product_name?: string
  marketplace?: string
  sold_at?: string
  sale_price?: number
  quantity?: number
  unit_cost?: number
  fee_1?: number
  fee_2?: number
  fee_3?: number
  ad_cost?: number
}

export function ExcelUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setStatus(null)

    try {
      // 엑셀 파싱
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' })

      if (rows.length === 0) {
        setStatus('데이터가 없습니다.')
        setLoading(false)
        return
      }

      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // public.users 레코드 보장 (Google OAuth 등 트리거 미작동 케이스 대응)
      await supabase
        .from('users')
        .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

      // 업로드 이력 기록
      const { data: upload, error: uploadErr } = await supabase
        .from('uploads')
        .insert({ user_id: user.id, original_file_name: file.name })
        .select('id')
        .single()

      if (uploadErr) {
        if (uploadErr.message?.includes('upload limit')) {
          throw new Error('무료 플랜 업로드 한도(10회)를 초과했습니다. Pro로 업그레이드하세요.')
        }
        throw uploadErr
      }

      // sales_records 삽입
      const records = rows.map((row) => ({
        user_id: user.id,
        upload_id: upload.id,
        product_name: row.product_name ?? '미입력',
        marketplace: row.marketplace ?? null,
        sold_at: row.sold_at ?? new Date().toISOString().split('T')[0],
        sale_price: Number(row.sale_price ?? 0),
        quantity: Number(row.quantity ?? 1),
        unit_cost: Number(row.unit_cost ?? 0),
        fee_1: Number(row.fee_1 ?? 0),
        fee_2: Number(row.fee_2 ?? 0),
        fee_3: Number(row.fee_3 ?? 0),
        ad_cost: Number(row.ad_cost ?? 0),
        input_type: 'excel',
      }))

      const { error: insertErr } = await supabase
        .from('sales_records')
        .insert(records)

      if (insertErr) {
        if (insertErr.message?.includes('row limit')) {
          throw new Error('무료 플랜 데이터 한도(1,000행)를 초과했습니다. Pro로 업그레이드하세요.')
        }
        throw insertErr
      }

      setStatus(`${records.length}개 데이터가 추가됐습니다.`)

      // 페이지 새로고침으로 그리드 갱신
      window.location.reload()
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : '업로드 중 오류가 발생했습니다.'
      console.error('Upload error:', err)
      setStatus(message)
    }

    setLoading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span className="text-sm text-muted-foreground">{status}</span>
      )}
      <Button
        variant="outline"
        className="text-primary font-bold flex items-center gap-2 shadow-sm hover:bg-lavender"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        <span className="material-symbols-outlined text-lg">upload_file</span>
        {loading ? '업로드 중...' : '엑셀 업로드'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}