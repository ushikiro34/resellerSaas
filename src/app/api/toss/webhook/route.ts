import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventType, data } = body

    // PAYMENT_STATUS_CHANGED 이벤트 처리
    if (eventType === 'PAYMENT_STATUS_CHANGED') {
      const { paymentKey, status: paymentStatus } = data

      if (paymentKey) {
        const dbStatus = paymentStatus === 'DONE' ? 'paid'
          : paymentStatus === 'CANCELED' ? 'cancelled'
          : paymentStatus === 'FAILED' ? 'failed'
          : null

        if (dbStatus) {
          await supabaseAdmin
            .from('payments')
            .update({ status: dbStatus })
            .eq('payment_key', paymentKey)
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Toss webhook error:', err)
    return new Response('Webhook Error', { status: 500 })
  }
}
