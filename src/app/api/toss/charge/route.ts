import { createClient } from '@supabase/supabase-js'
import { tossRequest } from '@/lib/toss/client'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // 내부 호출 인증 (서비스 키 검증)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionId } = await req.json()

    if (!subscriptionId) {
      return Response.json({ error: 'subscriptionId is required' }, { status: 400 })
    }

    // 구독 조회
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return Response.json({ error: 'Active subscription not found' }, { status: 404 })
    }

    // 결제 실행
    const orderId = `ORD-${crypto.randomUUID()}`
    const orderName = sub.plan_type === 'yearly' ? 'Pro 플랜 구독 (연간)' : 'Pro 플랜 구독 (월간)'

    const chargeRes = await tossRequest<{
      paymentKey: string
      approvedAt: string
      receipt?: { url?: string }
    }>(
      `/billing/${sub.billing_key}`,
      {
        body: {
          customerKey: sub.customer_key,
          amount: sub.amount,
          orderId,
          orderName,
        },
        idempotencyKey: orderId,
      }
    )

    if (chargeRes.ok) {
      const chargeData = chargeRes.data

      // 결제 이력 기록
      await supabaseAdmin.from('payments').insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        payment_key: chargeData.paymentKey,
        order_id: orderId,
        amount: sub.amount,
        status: 'paid',
        paid_at: chargeData.approvedAt,
        receipt_url: chargeData.receipt?.url ?? null,
        raw_response: chargeData,
      })

      // next_billing_date 갱신
      const next = new Date(sub.next_billing_date)
      if (sub.plan_type === 'yearly') {
        next.setFullYear(next.getFullYear() + 1)
      } else {
        next.setMonth(next.getMonth() + 1)
      }

      await supabaseAdmin
        .from('subscriptions')
        .update({
          next_billing_date: next.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id)

      // plan = pro 유지 확인
      await supabaseAdmin
        .from('users')
        .update({ plan: 'pro' })
        .eq('id', sub.user_id)

      return Response.json({ success: true, orderId })
    } else {
      // 결제 실패
      const errorData = chargeRes.data as { message?: string }

      await supabaseAdmin.from('payments').insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        order_id: orderId,
        amount: sub.amount,
        status: 'failed',
        failure_reason: errorData.message ?? 'Unknown error',
        raw_response: chargeRes.data,
      })

      // 최근 7일간 실패 횟수 확인
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { count } = await supabaseAdmin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_id', sub.id)
        .eq('status', 'failed')
        .gte('created_at', sevenDaysAgo)

      if ((count ?? 0) >= 3) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('id', sub.id)

        await supabaseAdmin
          .from('users')
          .update({ plan: 'free' })
          .eq('id', sub.user_id)
      }

      return Response.json({ success: false, error: errorData.message }, { status: 400 })
    }
  } catch (err) {
    console.error('Charge error:', err)
    return Response.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
