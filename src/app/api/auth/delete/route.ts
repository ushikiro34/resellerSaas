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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 유저 정보 조회 (삭제 로그용)
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    // 활성 구독 확인
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    // 데이터 건수 조회 (삭제 로그용)
    const [{ count: salesCount }, { count: uploadsCount }] = await Promise.all([
      supabaseAdmin
        .from('sales_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabaseAdmin
        .from('uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    // 삭제 로그 저장 (deleted_accounts 테이블)
    await supabaseAdmin
      .from('deleted_accounts')
      .insert({
        user_id: user.id,
        email: user.email ?? '',
        plan: userRecord?.plan ?? 'free',
        had_active_subscription: !!subscription,
        sales_records_count: salesCount ?? 0,
        uploads_count: uploadsCount ?? 0,
      })

    // 활성 구독 만료 처리
    if (subscription) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'expired',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id)
    }

    // 유저 관련 데이터 수동 삭제 (순서: 하위 → 상위)
    await supabaseAdmin.from('sales_records').delete().eq('user_id', user.id)
    await supabaseAdmin.from('uploads').delete().eq('user_id', user.id)
    await supabaseAdmin.from('dashboard_settings').delete().eq('user_id', user.id)
    await supabaseAdmin.from('revenue_daily').delete().eq('user_id', user.id)
    await supabaseAdmin.from('revenue_monthly').delete().eq('user_id', user.id)
    await supabaseAdmin.from('revenue_yearly').delete().eq('user_id', user.id)
    await supabaseAdmin.from('revenue_targets').delete().eq('user_id', user.id)
    await supabaseAdmin.from('payments').delete().eq('user_id', user.id)
    await supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id)
    await supabaseAdmin.from('users').delete().eq('id', user.id)

    // auth.users 삭제
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Delete auth user error:', deleteError)
      return Response.json({ error: '회원탈퇴에 실패했습니다.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return Response.json({ error: '회원탈퇴에 실패했습니다.' }, { status: 500 })
  }
}
