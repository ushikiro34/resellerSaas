'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, Printer, CreditCard, BadgeCheck, Loader2 } from 'lucide-react'

interface PaymentInfo {
  paidAt: string
  amount: number
  orderId: string
  receiptUrl: string | null
}

interface SubscriptionData {
  planType: string
  amount: number
  nextBillingDate: string
  lastPayment: PaymentInfo | null
}

export default function ReceiptPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SubscriptionData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? '')

      try {
        const res = await fetch('/api/toss/subscription', { method: 'POST' })
        if (res.ok) {
          const subData = await res.json()
          setData(subData)
        }
      } catch {
        // 구독 정보 조회 실패
      }
      setLoading(false)
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center px-4 py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const payment = data?.lastPayment
  const amount = payment?.amount ?? data?.amount ?? 8900
  const planLabel = data?.planType === 'yearly' ? '연간' : '월간'
  const periodLabel = data?.planType === 'yearly' ? '1년' : '1개월'

  const paymentDate = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

  const todayShort = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

  const periodEnd = data?.nextBillingDate
    ? new Date(data.nextBillingDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
    : ''

  const orderId = payment?.orderId ?? '-'

  return (
    <div className="h-full overflow-auto flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        {/* Receipt Card */}
        <div className="bg-card border rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              <h2 className="text-lg font-bold">결제 영수증</h2>
            </div>
            <button
              onClick={() => router.back()}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Transaction Details */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">결제 일시</span>
                <span>{paymentDate}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">주문 번호</span>
                <span className="font-mono text-xs">{orderId}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">결제 수단</span>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>카드 결제</span>
                </div>
              </div>
              {email && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">결제 계정</span>
                  <span>{email}</span>
                </div>
              )}
            </div>

            {/* Dashed Divider with circle cutouts */}
            <div className="relative">
              <div className="border-t border-dashed" />
              <div className="absolute -left-9 -top-2 w-4 h-4 bg-background rounded-full" />
              <div className="absolute -right-9 -top-2 w-4 h-4 bg-background rounded-full" />
            </div>

            {/* Itemized List */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">항목 상세</h3>
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-semibold">Pro 플랜 구독 ({planLabel})</span>
                  <span className="text-muted-foreground text-sm">
                    {periodLabel} 이용권 ({todayShort} - {periodEnd})
                  </span>
                </div>
                <span className="font-semibold shrink-0">&#8361; {amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Total */}
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">총 결제 금액</span>
                <span className="text-primary font-extrabold text-2xl tracking-tight">
                  &#8361; {amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wide">
                <BadgeCheck className="w-3.5 h-3.5" />
                결제 완료
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-muted/50 flex flex-col gap-3 border-t print:hidden">
            <Button className="w-full py-5" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              영수증 인쇄하기
            </Button>
            {payment?.receiptUrl && (
              <Button variant="outline" className="w-full py-5" asChild>
                <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                  토스 영수증 보기
                </a>
              </Button>
            )}
            <Button variant="outline" className="w-full py-5" onClick={() => router.push('/pricing/success')}>
              돌아가기
            </Button>
          </div>

          {/* Brand Footer */}
          <div className="pb-6 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              리셀러 데이터 SaaS
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
