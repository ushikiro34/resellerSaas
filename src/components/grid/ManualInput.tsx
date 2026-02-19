'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PenLine } from 'lucide-react'

const REVENUE_TYPE_OPTIONS = [
  { value: 'product', label: '상품' },
  { value: 'subscription', label: '구독' },
  { value: 'ads', label: '광고' },
] as const

const defaultForm = {
  product_name: '',
  marketplace: '',
  sold_at: new Date().toISOString().split('T')[0],
  sale_price: '',
  quantity: '1',
  unit_cost: '',
  fee_1: '0',
  fee_2: '0',
  fee_3: '0',
  ad_cost: '0',
  revenue_type: 'product',
  region: 'KR',
}

export function ManualInput() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('로그인이 필요합니다.'); setLoading(false); return }

    await supabase.from('users').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

    const { error: err } = await supabase.from('sales_records').insert({
      user_id: user.id,
      product_name: form.product_name,
      marketplace: form.marketplace || null,
      sold_at: form.sold_at,
      sale_price: Number(form.sale_price),
      quantity: Number(form.quantity),
      unit_cost: Number(form.unit_cost),
      fee_1: Number(form.fee_1),
      fee_2: Number(form.fee_2),
      fee_3: Number(form.fee_3),
      ad_cost: Number(form.ad_cost),
      revenue_type: form.revenue_type,
      region: form.region,
      input_type: 'manual',
    })

    if (err) {
      if (err.message?.includes('row limit')) {
        setError('무료 플랜 데이터 한도(1,000행)를 초과했습니다. Pro로 업그레이드하세요.')
      } else {
        setError(err.message)
      }
    } else {
      setForm(defaultForm)
      setOpen(false)
      window.location.reload()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-primary font-bold flex items-center gap-2 shadow-sm hover:bg-lavender">
          <span className="material-symbols-outlined text-lg">add_circle</span>
          직접 입력
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>판매 데이터 직접 입력</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>상품명 *</Label>
              <Input value={form.product_name} onChange={set('product_name')} required />
            </div>
            <div className="space-y-1">
              <Label>판매처</Label>
              <Input value={form.marketplace} onChange={set('marketplace')} placeholder="무신사, 크림..." />
            </div>
            <div className="space-y-1">
              <Label>매출 유형 *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.revenue_type}
                onChange={set('revenue_type')}
              >
                {REVENUE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>지역 *</Label>
              <Input value={form.region} onChange={set('region')} placeholder="KR, US, JP..." required />
            </div>
            <div className="space-y-1">
              <Label>판매일 *</Label>
              <Input type="date" value={form.sold_at} onChange={set('sold_at')} required />
            </div>
            <div className="space-y-1">
              <Label>판매가 *</Label>
              <Input type="number" value={form.sale_price} onChange={set('sale_price')} required min={0} />
            </div>
            <div className="space-y-1">
              <Label>수량 *</Label>
              <Input type="number" value={form.quantity} onChange={set('quantity')} required min={1} />
            </div>
            <div className="space-y-1">
              <Label>원가</Label>
              <Input type="number" value={form.unit_cost} onChange={set('unit_cost')} min={0} />
            </div>
            <div className="space-y-1">
              <Label>광고비</Label>
              <Input type="number" value={form.ad_cost} onChange={set('ad_cost')} min={0} />
            </div>
            <div className="space-y-1">
              <Label>수수료1</Label>
              <Input type="number" value={form.fee_1} onChange={set('fee_1')} min={0} />
            </div>
            <div className="space-y-1">
              <Label>수수료2</Label>
              <Input type="number" value={form.fee_2} onChange={set('fee_2')} min={0} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}