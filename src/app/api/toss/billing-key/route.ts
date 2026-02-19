import { createClient } from '@supabase/supabase-js'
import { tossRequest } from '@/lib/toss/client'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_AMOUNTS: Record<string, number> = {
  monthly: 8900,
  yearly: 85440,
}

export async function POST(req: Request) {
  try {
    const { authKey, customerKey, planType } = await req.json()

    if (!authKey || !customerKey || !planType) {
      return Response.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    const amount = PLAN_AMOUNTS[planType]
    if (!amount) {
      return Response.json({ error: '잘못된 플랜 타입입니다.' }, { status: 400 })
    }

    // 1. 빌링키 발급
    const billingRes = await tossRequest<{ billingKey: string; customerKey: string }>(
      '/billing/authorizations/issue',
      { body: { authKey, customerKey } }
    )

    if (!billingRes.ok) {
      console.error('Billing key issue failed:', billingRes.data)
      return Response.json({ error: '빌링키 발급에 실패했습니다.', detail: billingRes.data }, { status: 400 })
    }

    const { billingKey } = billingRes.data

    // 2. 첫 결제
    const orderId = `ORD-${crypto.randomUUID()}`
    const orderName = planType === 'yearly' ? 'Pro 플랜 구독 (연간)' : 'Pro 플랜 구독 (월간)'

    const chargeRes = await tossRequest<{
      paymentKey: string
      approvedAt: string
      receipt?: { url?: string }
    }>(
      `/billing/${billingKey}`,
      {
        body: { customerKey, amount, orderId, orderName },
        idempotencyKey: orderId,
      }
    )

    if (!chargeRes.ok) {
      console.error('First charge failed:', chargeRes.data)
      return Response.json({ error: '첫 결제에 실패했습니다.', detail: chargeRes.data }, { status: 400 })
    }

    const chargeData = chargeRes.data

    // 3. customerKey에서 userId 추출 (customerKey = user.id)
    const userId = customerKey

    // 4. next_billing_date 계산
    const nextBilling = new Date()
    if (planType === 'yearly') {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1)
    } else {
      nextBilling.setMonth(nextBilling.getMonth() + 1)
    }

    // 5. 기존 active 구독이 있으면 expired 처리
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active')

    // 6. 구독 레코드 생성
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        billing_key: billingKey,
        customer_key: customerKey,
        plan_type: planType,
        status: 'active',
        amount,
        next_billing_date: nextBilling.toISOString(),
      })
      .select('id')
      .single()

    if (subError) {
      console.error('Subscription insert error:', subError)
      return Response.json({ error: '구독 생성에 실패했습니다.' }, { status: 500 })
    }

    // 7. 결제 이력 기록
    await supabaseAdmin.from('payments').insert({
      user_id: userId,
      subscription_id: subscription.id,
      payment_key: chargeData.paymentKey,
      order_id: orderId,
      amount,
      status: 'paid',
      paid_at: chargeData.approvedAt,
      receipt_url: chargeData.receipt?.url ?? null,
      raw_response: chargeData,
    })

    // 8. 유저 플랜 업데이트
    await supabaseAdmin
      .from('users')
      .update({ plan: 'pro' })
      .eq('id', userId)

    return Response.json({
      success: true,
      subscriptionId: subscription.id,
      nextBillingDate: nextBilling.toISOString(),
      amount,
      planType,
    })
  } catch (err) {
    console.error('Billing key error:', err)
    return Response.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
