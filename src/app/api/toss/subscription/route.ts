import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST() {
  try {
    // 유저 인증
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // admin 클라이언트로 구독 조회
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      return Response.json({ error: '구독 정보가 없습니다.' }, { status: 404 })
    }

    // 최근 결제 조회
    const { data: lastPayment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('subscription_id', subscription.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return Response.json({
      status: subscription.status,
      planType: subscription.plan_type,
      amount: subscription.amount,
      nextBillingDate: subscription.next_billing_date,
      cancelledAt: subscription.cancelled_at,
      createdAt: subscription.created_at,
      lastPayment: lastPayment
        ? {
            paidAt: lastPayment.paid_at,
            amount: lastPayment.amount,
            orderId: lastPayment.order_id,
            receiptUrl: lastPayment.receipt_url,
          }
        : null,
    })
  } catch (err) {
    console.error('Subscription query error:', err)
    return Response.json({ error: '구독 정보 조회에 실패했습니다.' }, { status: 500 })
  }
}
