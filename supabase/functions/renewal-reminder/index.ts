// Supabase Edge Function: 자동갱신 이메일 알림
// - 월간 구독: 갱신 7일 전 알림
// - 연간 구독: 갱신 15일 전 알림
//
// pg_cron으로 매일 09:00 KST (00:00 UTC) 실행
//
// pg_cron 설정 SQL:
// select cron.schedule(
//   'renewal-reminder',
//   '0 0 * * *',
//   $$
//   select net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/renewal-reminder',
//     headers := jsonb_build_object(
//       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
//     ),
//     body := '{}'::jsonb
//   );
//   $$
// );
//
// 환경변수 필요:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (자동 제공)
// - RESEND_API_KEY (Resend에서 발급: https://resend.com)
// - EMAIL_FROM (발신 이메일, 예: noreply@yourdomain.com)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'Reseller Data <noreply@reseller-data.com>'

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  })
  return res.ok
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function formatAmount(amount: number) {
  return amount.toLocaleString('ko-KR')
}

Deno.serve(async (req) => {
  // 인증 검증
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const results = { sent: 0, failed: 0, skipped: 0 }
  const now = new Date()
  const DAY_MS = 24 * 60 * 60 * 1000
  const HALF_DAY_MS = 12 * 60 * 60 * 1000

  // 월간 구독: 7일 전 알림 / 연간 구독: 15일 전 알림
  const reminderConfigs = [
    { planType: 'monthly', daysBeforeRenewal: 7 },
    { planType: 'yearly', daysBeforeRenewal: 15 },
  ]

  const allSubs: Array<Record<string, unknown>> = []

  for (const config of reminderConfigs) {
    const targetDate = new Date(now.getTime() + config.daysBeforeRenewal * DAY_MS)
    // ±12시간 범위 (매일 실행되므로 하루 범위로 조회)
    const rangeStart = new Date(targetDate.getTime() - HALF_DAY_MS).toISOString()
    const rangeEnd = new Date(targetDate.getTime() + HALF_DAY_MS).toISOString()

    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('*, users!inner(email)')
      .eq('status', 'active')
      .eq('plan_type', config.planType)
      .gte('next_billing_date', rangeStart)
      .lte('next_billing_date', rangeEnd)

    if (data) allSubs.push(...data)
  }

  for (const sub of allSubs) {
    const email = sub.users as { email: string } | null
    if (!email?.email) {
      results.skipped++
      continue
    }

    const planLabel = sub.plan_type === 'yearly' ? '연간' : '월간'
    const daysLeft = sub.plan_type === 'yearly' ? 15 : 7
    const renewalDate = formatDate(sub.next_billing_date as string)
    const amount = formatAmount(sub.amount as number)

    const subject = `[리셀러 데이터] Pro 플랜 자동 갱신 ${daysLeft}일 전 안내`
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="background: #4f46e5; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">리셀러 데이터</h1>
        </div>
        <div style="padding: 32px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0; color: #111827;">자동 갱신 안내</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            안녕하세요. 리셀러 데이터를 이용해 주셔서 감사합니다.
          </p>
          <p style="color: #6b7280; line-height: 1.6;">
            회원님의 <strong style="color: #111827;">Pro 플랜 (${planLabel})</strong> 구독이
            <strong style="color: #4f46e5;">${renewalDate}</strong>에 자동 갱신될 예정입니다.
          </p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">구독 플랜</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">Pro (${planLabel})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">결제 예정 금액</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">₩ ${amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">결제 예정일</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${renewalDate}</td>
              </tr>
            </table>
          </div>
          <p style="color: #6b7280; line-height: 1.6;">
            구독을 계속 이용하시려면 별도의 조치가 필요 없습니다.
            등록된 결제 수단으로 자동 결제됩니다.
          </p>
          <p style="color: #6b7280; line-height: 1.6;">
            구독을 해지하시려면 갱신일 전까지 마이페이지에서 해지하실 수 있습니다.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
            본 메일은 리셀러 데이터 서비스의 자동 갱신 안내 메일입니다.<br />
            문의사항이 있으시면 ushikiro34@gmail.com으로 연락해 주세요.
          </p>
        </div>
      </div>
    `

    const sent = await sendEmail(email.email, subject, html)
    if (sent) {
      results.sent++
    } else {
      results.failed++
    }
  }

  console.log('Renewal reminder results:', results)

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  })
})
