import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CalendarEvent {
  summary: string
  description: string
  date: string
}

async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const data = await res.json()
  return {
    access_token: data.access_token as string,
    expires_in: data.expires_in as number,
  }
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single()

  if (!userData?.google_access_token) {
    return Response.json(
      { error: 'NO_GOOGLE_TOKEN', message: 'Google reconnection required' },
      { status: 400 }
    )
  }

  // Decrypt tokens from DB
  const decryptedAccess = decrypt(userData.google_access_token)
  if (!decryptedAccess) {
    return Response.json(
      { error: 'NO_GOOGLE_TOKEN', message: 'Google reconnection required' },
      { status: 400 }
    )
  }

  let accessToken = decryptedAccess

  // Check if token is expired and refresh if needed
  if (userData.google_token_expires_at) {
    const expiresAt = new Date(userData.google_token_expires_at)
    const now = new Date()
    if (now >= expiresAt && userData.google_refresh_token) {
      const decryptedRefresh = decrypt(userData.google_refresh_token)
      if (!decryptedRefresh) {
        return Response.json(
          { error: 'TOKEN_REFRESH_FAILED', message: 'Google reconnection required' },
          { status: 400 }
        )
      }
      const refreshed = await refreshGoogleToken(decryptedRefresh)
      if (refreshed) {
        accessToken = refreshed.access_token
        await supabaseAdmin
          .from('users')
          .update({
            google_access_token: encrypt(refreshed.access_token),
            google_token_expires_at: new Date(
              Date.now() + refreshed.expires_in * 1000
            ).toISOString(),
          })
          .eq('id', user.id)
      } else {
        return Response.json(
          { error: 'TOKEN_REFRESH_FAILED', message: 'Google reconnection required' },
          { status: 400 }
        )
      }
    }
  }

  const { events } = (await req.json()) as { events: CalendarEvent[] }

  if (!events || events.length === 0) {
    return Response.json({ succeeded: 0, failed: 0 })
  }

  const results = await Promise.allSettled(
    events.map((event) =>
      fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { date: event.date },
          end: { date: event.date },
        }),
      }).then((res) => {
        if (!res.ok) throw new Error(`Google API error: ${res.status}`)
        return res.json()
      })
    )
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return Response.json({ succeeded, failed })
}