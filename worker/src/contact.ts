export interface Env {
  ALLOWED_ORIGINS: string
  CONTACT_TO: string
  RESEND_API_KEY: string
  TURNSTILE_SECRET: string
}

type Fetcher = typeof fetch

const MAX_BODY_BYTES = 10_000
const LIMITS = { name: 100, email: 254, message: 5_000, token: 2_048 } as const
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const RESEND_URL = 'https://api.resend.com/emails'
const FROM = 'Portfólio <onboarding@resend.dev>'

interface ContactMessage {
  name: string
  email: string
  message: string
  token: string
  website: string
}

function json(body: unknown, status: number, origin: string | null) {
  return Response.json(body, { status, headers: corsHeaders(origin) })
}

function corsHeaders(origin: string | null): HeadersInit {
  return origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : {}
}

function isAllowed(origin: string | null, env: Env): origin is string {
  if (!origin) return false
  return env.ALLOWED_ORIGINS.split(',').some((allowed) => allowed.trim() === origin)
}

const isControl = (char: string) => {
  const code = char.charCodeAt(0)
  return code < 0x20 || code === 0x7f
}

const clean = (value: string) =>
  Array.from(value, (char) => (isControl(char) ? ' ' : char))
    .join('')
    .trim()

function parseMessage(raw: unknown): ContactMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '')
  const message: ContactMessage = {
    name: clean(text('name')),
    email: clean(text('email')),
    message: text('message').trim(),
    token: text('token').trim(),
    website: text('website').trim(),
  }
  const valid =
    message.name.length > 0 &&
    message.name.length <= LIMITS.name &&
    message.email.length <= LIMITS.email &&
    EMAIL.test(message.email) &&
    message.message.length > 0 &&
    message.message.length <= LIMITS.message &&
    message.token.length > 0 &&
    message.token.length <= LIMITS.token
  return valid ? message : null
}

async function isHuman(token: string, ip: string | null, env: Env, fetcher: Fetcher) {
  const form = new FormData()
  form.append('secret', env.TURNSTILE_SECRET)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  const response = await fetcher(TURNSTILE_URL, { method: 'POST', body: form })
  if (!response.ok) return false
  const result = (await response.json()) as { success?: boolean }
  return result.success === true
}

async function sendEmail(message: ContactMessage, env: Env, fetcher: Fetcher) {
  const response = await fetcher(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [env.CONTACT_TO],
      reply_to: message.email,
      subject: `Portfólio: mensagem de ${message.name}`,
      text: `${message.name} <${message.email}>\n\n${message.message}`,
    }),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      name?: string
      message?: string
    } | null
    console.error('resend rejected', response.status, error?.name, error?.message)
  }
  return response.ok
}

export async function handleRequest(request: Request, env: Env, fetcher: Fetcher = fetch) {
  const origin = request.headers.get('Origin')
  if (!isAllowed(origin, env)) return json({ ok: false, error: 'forbidden' }, 403, null)
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (request.method !== 'POST')
    return json({ ok: false, error: 'method_not_allowed' }, 405, origin)

  const body = await request.text()
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'too_large' }, 413, origin)
  }
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return json({ ok: false, error: 'invalid' }, 400, origin)
  }
  const message = parseMessage(raw)
  if (!message) return json({ ok: false, error: 'invalid' }, 400, origin)

  if (message.website) return json({ ok: true }, 200, origin)

  if (!(await isHuman(message.token, request.headers.get('CF-Connecting-IP'), env, fetcher))) {
    return json({ ok: false, error: 'not_human' }, 403, origin)
  }
  if (!(await sendEmail(message, env, fetcher))) {
    return json({ ok: false, error: 'send_failed' }, 502, origin)
  }
  return json({ ok: true }, 200, origin)
}
