'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Check, ArrowRight, Receipt, Settings, Loader2, AlertTriangle } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="h-full overflow-auto flex items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-lg font-medium">로딩 중...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    amount: number
    planType: string
    nextBillingDate: string
  } | null>(null)
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const process = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? '')

      // TossPayments 리다이렉트에서 authKey, customerKey 파싱
      const authKey = searchParams.get('authKey')
      const customerKey = searchParams.get('customerKey')
      const planType = searchParams.get('planType') ?? 'monthly'

      if (authKey && customerKey) {
        // 빌링키 발급 + 첫 결제
        try {
          const res = await fetch('/api/toss/billing-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authKey, customerKey, planType }),
          })
          const data = await res.json()

          if (!res.ok) {
            setError(data.error ?? '결제 처리에 실패했습니다.')
            setLoading(false)
            return
          }

          setSubscriptionInfo({
            amount: data.amount,
            planType: data.planType,
            nextBillingDate: new Date(data.nextBillingDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          })
        } catch {
          setError('결제 처리 중 오류가 발생했습니다.')
        }
      } else {
        // authKey 없이 직접 접근한 경우 - 기존 구독 정보 조회
        try {
          const res = await fetch('/api/toss/subscription', { method: 'POST' })
          if (res.ok) {
            const data = await res.json()
            setSubscriptionInfo({
              amount: data.amount,
              planType: data.planType,
              nextBillingDate: new Date(data.nextBillingDate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            })
          }
        } catch {
          // 구독 정보 없어도 괜찮음
        }
      }

      setLoading(false)
    }

    process()
  }, [router, searchParams])

  // 로딩 중
  if (loading) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-lg font-medium">결제를 처리하고 있습니다...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요.</p>
        </div>
      </div>
    )
  }

  // 에러
  if (error) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center px-4 py-12">
        <div className="max-w-[520px] w-full flex flex-col items-center">
          <div className="mb-8 relative">
            <div className="relative flex items-center justify-center w-24 h-24 bg-card rounded-full shadow-xl border-4 border-destructive">
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-3">결제에 실패했습니다</h1>
          <p className="text-muted-foreground text-center mb-8">{error}</p>
          <Button className="w-full max-w-xs" onClick={() => router.push('/pricing')}>
            다시 시도하기
          </Button>
        </div>
      </div>
    )
  }

  const displayAmount = subscriptionInfo?.amount ?? 8900
  const displayPlanLabel = subscriptionInfo?.planType === 'yearly' ? '연간' : '월간'

  return (
    <div className="h-full overflow-auto flex items-center justify-center px-4 py-12">
      <div className="max-w-[520px] w-full flex flex-col items-center">
        {/* Success Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-card rounded-full shadow-xl border-4 border-emerald-500">
            <Check className="w-12 h-12 text-emerald-500" strokeWidth={3} />
          </div>
        </div>

        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-3">
          결제가 완료되었습니다!
        </h1>
        <p className="text-lg text-muted-foreground text-center mb-10 max-w-sm leading-relaxed">
          Pro 플랜 구독을 시작해 주셔서 감사합니다.<br />
          이제 모든 프리미엄 기능을 사용할 수 있습니다.
        </p>

        {/* Subscription Summary Card */}
        <div className="w-full bg-card border rounded-2xl p-6 md:p-8 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">구독 정보</span>
              <h3 className="text-2xl font-bold">Pro 플랜</h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <p className="text-sm font-medium">
                  결제 금액: &#8361; {displayAmount.toLocaleString()} / {displayPlanLabel}
                </p>
              </div>
            </div>
            <div className="h-24 w-full md:w-40 rounded-lg overflow-hidden relative bg-gradient-to-br from-primary/10 to-indigo-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 40 }}>auto_awesome</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-dashed">
            {subscriptionInfo?.nextBillingDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">다음 결제 예정일</span>
                <span className="font-medium">{subscriptionInfo.nextBillingDate}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">결제 계정</span>
                <span className="font-medium">{email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-4">
          <Button
            className="w-full h-14 text-lg font-bold shadow-lg"
            onClick={() => router.push('/dashboard')}
          >
            대시보드로 이동
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <div className="flex items-center justify-center gap-6 mt-2">
            <button
              className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium flex items-center gap-1.5"
              onClick={() => router.push('/pricing/receipt')}
            >
              <Receipt className="w-4 h-4" />
              영수증 보기
            </button>
            <button
              className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium flex items-center gap-1.5"
              onClick={() => router.push('/mypage')}
            >
              <Settings className="w-4 h-4" />
              구독 관리
            </button>
          </div>
        </div>

        {/* Support Footer */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground text-xs">
            결제 관련 문의사항이 있으신가요?
            <a className="text-primary hover:underline font-medium ml-1" href="mailto:support@example.com">
              고객 지원 센터
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
