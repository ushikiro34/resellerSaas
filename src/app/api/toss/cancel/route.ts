import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { tossRequest } from '@/lib/toss/client'

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // active 구독 조회
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!subscription) {
      return Response.json({ error: '활성 구독이 없습니다.' }, { status: 404 })
    }

    // 청약철회 판단: 결제일로부터 7일 이내 + 데이터 변화 없음
    const subscriptionStartDate = subscription.created_at
    const daysSinceSubscription = Math.floor(
      (Date.now() - new Date(subscriptionStartDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    const isWithin7Days = daysSinceSubscription <= 7

    const [{ count: newUploads }, { count: newRecords }] = await Promise.all([
      supabaseAdmin
        .from('uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('uploaded_at', subscriptionStartDate),
      supabaseAdmin
        .from('sales_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', subscriptionStartDate),
    ])

    const hasDataChanges = (newUploads ?? 0) > 0 || (newRecords ?? 0) > 0

    // 환불 조건: 7일 이내 + 서비스 미사용 (데이터 변화 없음)
    if (isWithin7Days && !hasDataChanges) {
      // 청약철회: 7일 이내 미사용 → 전액 환불 처리
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (payment?.payment_key) {
        // 토스페이먼츠 결제 취소 (환불)
        const cancelRes = await tossRequest(`/payments/${payment.payment_key}/cancel`, {
          body: {
            cancelReason: '청약철회 - 결제 후 7일 이내 서비스 미사용 전액 환불',
          },
        })

        if (cancelRes.ok) {
          // 결제 상태 cancelled로 변경
          await supabaseAdmin
            .from('payments')
            .update({ status: 'cancelled' })
            .eq('id', payment.id)

          // 구독 expired + 유저 플랜 free로 즉시 전환
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'expired',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id)

          await supabaseAdmin
            .from('users')
            .update({ plan: 'free' })
            .eq('id', user.id)

          return Response.json({
            success: true,
            refunded: true,
            refundAmount: payment.amount,
            message: '청약철회(7일 이내 서비스 미사용)로 전액 환불 처리되었습니다.',
          })
        } else {
          console.error('Toss cancel failed:', cancelRes.data)
          // 환불 실패 시 일반 해지로 진행
        }
      }
    }

    // 데이터 변화 있음 또는 환불 실패 → 일반 구독 해지 (next_billing_date까지 Pro 유지)
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    return Response.json({
      success: true,
      refunded: false,
      activeUntil: subscription.next_billing_date,
    })
  } catch (err) {
    console.error('Cancel subscription error:', err)
    return Response.json({ error: '구독 해지에 실패했습니다.' }, { status: 500 })
  }
}
