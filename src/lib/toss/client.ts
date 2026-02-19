const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const TOSS_BASE_URL = 'https://api.tosspayments.com/v1'

function getAuthHeader() {
  return `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`
}

export async function tossRequest<T = unknown>(
  path: string,
  options: {
    method?: string
    body?: Record<string, unknown>
    idempotencyKey?: string
  } = {}
): Promise<{ ok: boolean; data: T; status: number }> {
  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
    'Content-Type': 'application/json',
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }

  const res = await fetch(`${TOSS_BASE_URL}${path}`, {
    method: options.method ?? 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json()
  return { ok: res.ok, data, status: res.status }
}
