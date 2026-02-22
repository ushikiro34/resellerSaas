// Supabase Edge Function: 회원탈퇴 로그 30일 경과 시 자동 삭제
// pg_cron으로 매일 03:00 KST (18:00 UTC 전날) 실행
//
// pg_cron 설정 SQL:
// select cron.schedule(
//   'cleanup-deleted-accounts',
//   '0 18 * * *',
//   $$
//   select net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/cleanup-deleted-accounts',
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

Deno.serve(async (req) => {
  // 인증 검증
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // 30일 이상 경과된 삭제 로그 조회
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: oldRecords, error: selectError } = await supabaseAdmin
      .from('deleted_accounts')
      .select('id')
      .lt('deleted_at', thirtyDaysAgo)

    if (selectError) {
      console.error('Select error:', selectError)
      return new Response(JSON.stringify({ error: selectError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const count = oldRecords?.length ?? 0

    if (count === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: '정리할 로그가 없습니다.' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 30일 이상 경과된 레코드 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('deleted_accounts')
      .delete()
      .lt('deleted_at', thirtyDaysAgo)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Cleaned up ${count} deleted account logs older than 30 days`)

    return new Response(JSON.stringify({ deleted: count }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Cleanup error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
