'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { usePlanInfo } from '@/lib/hooks/usePlanInfo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Info, Sparkles, ArrowLeft, AlertCircle } from 'lucide-react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const FREE_FEATURES = [
  { text: '데이터 최대 1,000행', included: true },
  { text: '엑셀 업로드 10회', included: true },
  { text: '기본 대시보드', included: true },
  { text: '인터페이스 내 광고 포함', included: false },
]

const PRO_FEATURES = [
  { text: '무제한 데이터 업로드' },
  { text: '무제한 엑셀 업로드' },
  { text: '고급 매출 분석 (YoY, 워터폴)' },
  { text: '완전한 광고 제거 경험' },
]

const MONTHLY_PRICE = 8900
const YEARLY_PRICE = 7120 // 20% discount

export default function PricingPage() {
  const router = useRouter()
  const { plan, loading: planLoading } = usePlanInfo()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [upgrading, setUpgrading] = useState(false)
  const [yearlyConfirmOpen, setYearlyConfirmOpen] = useState(false)

  const price = billing === 'yearly' ? YEARLY_PRICE : MONTHLY_PRICE

  const proceedToPayment = async () => {
    setUpgrading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setUpgrading(false); return }

      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      const payment = tossPayments.payment({ customerKey: user.id })

      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}/pricing/success?planType=${billing}`,
        failUrl: `${window.location.origin}/pricing?error=payment_failed`,
        customerEmail: user.email ?? undefined,
        customerName: user.email?.split('@')[0] ?? undefined,
      })
    } catch (err) {
      console.error('TossPayments error:', err)
    }
    setUpgrading(false)
  }

  const handleUpgrade = () => {
    if (billing === 'yearly') {
      setYearlyConfirmOpen(true)
    } else {
      proceedToPayment()
    }
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 tracking-tight">
            Pro 플랜으로 업무 효율을<br className="hidden sm:block" /> 극대화하세요
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            저렴한 월 {MONTHLY_PRICE.toLocaleString()}원으로 플랫폼의 모든 기능을 경험해 보세요.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={cn(
              'text-sm font-medium transition-colors w-16 text-right',
              billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              월간 결제
            </span>
            <button
              onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                billing === 'yearly' ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm',
                billing === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
            <span className={cn(
              'text-sm font-medium transition-colors w-16 text-left',
              billing === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              연간 결제
            </span>
            <span className={cn(
              'text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full transition-opacity',
              billing === 'yearly' ? 'opacity-100' : 'opacity-0'
            )}>
              20% 할인
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-card border rounded-2xl p-8 flex flex-col min-h-[520px] hover:border-muted-foreground/30 transition-all">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">무료 플랜</h3>
              <p className="text-muted-foreground text-sm">개인적인 탐색과 시작에 적합합니다.</p>
            </div>

            <div className="mb-6 h-16 flex items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">&#8361; 0</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className={cn(
                  'flex items-center gap-3 text-sm',
                  !f.included && 'text-muted-foreground'
                )}>
                  {f.included ? (
                    <Check className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Info className="w-5 h-5 shrink-0" />
                  )}
                  {f.text}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full py-5 mt-auto"
              disabled={plan === 'free'}
            >
              {plan === 'free' ? '현재 플랜' : plan === 'pro' ? '다운그레이드' : '현재 플랜'}
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="relative bg-[#1e1b4b] text-white border-2 border-indigo-400/50 rounded-2xl p-8 flex flex-col min-h-[520px] shadow-2xl overflow-hidden">
            {/* Badge */}
            <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">
              최고의 선택
            </div>

            {/* Glow decoration */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 blur-3xl rounded-full bg-indigo-500/20 pointer-events-none" />

            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">Pro 플랜</h3>
              <p className="text-slate-400 text-sm">고급 기능으로 업무 속도를 높이세요.</p>
            </div>

            <div className="mb-6 h-16 flex flex-col justify-end">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">&#8361; {price.toLocaleString()}</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className={cn(
                'text-xs text-slate-400 mt-1 transition-opacity',
                billing === 'yearly' ? 'opacity-100' : 'opacity-0'
              )}>
                연간 &#8361; {(YEARLY_PRICE * 12).toLocaleString()}원 결제
              </p>
            </div>

            <ul className="space-y-4 mb-8 flex-grow relative z-10">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="material-symbols-outlined text-xl text-indigo-400">verified</span>
                  {f.text}
                </li>
              ))}
            </ul>

            <Button
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/40 relative z-10 mt-auto"
              onClick={handleUpgrade}
              disabled={upgrading || plan === 'pro'}
            >
              {plan === 'pro' ? (
                '현재 플랜'
              ) : upgrading ? (
                '처리 중...'
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  지금 업그레이드하기
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 연간 결제 확인 모달 */}
      <Dialog open={yearlyConfirmOpen} onOpenChange={setYearlyConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>연간 결제 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-2">연간 구독을 결제하시겠습니까?</p>
                <p className="text-muted-foreground">
                  결제 금액: <span className="font-bold text-foreground">&#8361; {(YEARLY_PRICE * 12).toLocaleString()}</span> (12개월)
                </p>
                <p className="text-muted-foreground mt-1">
                  월 &#8361; {YEARLY_PRICE.toLocaleString()} × 12개월, 월간 대비 20% 할인이 적용된 금액입니다.
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  결제 후 서비스 미사용 시 전액 환불이 가능합니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setYearlyConfirmOpen(false)}>취소</Button>
              <Button
                onClick={() => {
                  setYearlyConfirmOpen(false)
                  proceedToPayment()
                }}
              >
                결제 진행
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
