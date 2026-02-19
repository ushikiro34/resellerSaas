// Supabase Edge Function: 정기결제 자동 처리
// pg_cron으로 매일 09:00 KST (00:00 UTC) 실행
//
// pg_cron 설정 SQL:
// select cron.schedule(
//   'charge-due-subscriptions',
//   '0 0 * * *',
//   $$
//   select net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/charge-subscriptions',
//     headers := jsonb_build_object(
//       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
//     ),
//     body := '{}'::jsonb
//   );
//   $$
// );

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY')!
const TOSS_AUTH = btoa(TOSS_SECRET_KEY + ':')
const TOSS_BASE_URL = 'https://api.tosspayments.com/v1'

async function chargeBillingKey(
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string
) {
  const res = await fetch(`${TOSS_BASE_URL}/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${TOSS_AUTH}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': orderId,
    },
    body: JSON.stringify({ customerKey, amount, orderId, orderName }),
  })
  return { ok: res.ok, data: await res.json() }
}

Deno.serve(async (req) => {
  // 인증 검증
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const results = { charged: 0, failed: 0, expired: 0 }

  // 1. 결제 대상 조회: active 구독 중 next_billing_date가 현재 이전인 것
  const { data: dueSubs } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('next_billing_date', new Date().toISOString())

  for (const sub of dueSubs ?? []) {
    const orderId = `ORD-${crypto.randomUUID()}`
    const orderName = sub.plan_type === 'yearly'
      ? 'Pro 플랜 구독 (연간)'
      : 'Pro 플랜 구독 (월간)'

    try {
      const { ok, data } = await chargeBillingKey(
        sub.billing_key,
        sub.customer_key,
        sub.amount,
        orderId,
        orderName
      )

      if (ok) {
        // 결제 성공
        const next = new Date(sub.next_billing_date)
        if (sub.plan_type === 'yearly') {
          next.setFullYear(next.getFullYear() + 1)
        } else {
          next.setMonth(next.getMonth() + 1)
        }

        await supabaseAdmin.from('payments').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          payment_key: data.paymentKey,
          order_id: orderId,
          amount: sub.amount,
          status: 'paid',
          paid_at: data.approvedAt,
          receipt_url: data.receipt?.url ?? null,
          raw_response: data,
        })

        await supabaseAdmin
          .from('subscriptions')
          .update({
            next_billing_date: next.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id)

        results.charged++
      } else {
        // 결제 실패
        await supabaseAdmin.from('payments').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          order_id: orderId,
          amount: sub.amount,
          status: 'failed',
          failure_reason: data.message ?? 'Unknown error',
          raw_response: data,
        })

        // 7일간 3회 이상 실패 시 past_due 처리
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

        results.failed++
      }
    } catch (err) {
      console.error(`Charge failed for subscription ${sub.id}:`, err)
      results.failed++
    }
  }

  // 2. 만료된 cancelled 구독 처리: next_billing_date 지난 건 → expired + free
  const { data: expiredSubs } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id')
    .eq('status', 'cancelled')
    .lte('next_billing_date', new Date().toISOString())

  for (const sub of expiredSubs ?? []) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', sub.id)

    await supabaseAdmin
      .from('users')
      .update({ plan: 'free' })
      .eq('id', sub.user_id)

    results.expired++
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  })
})
