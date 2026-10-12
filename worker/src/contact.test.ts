import { describe, expect, it, vi } from 'vitest'
import { handleRequest } from './contact'
import type { Env } from './contact'

const env: Env = {
  ALLOWED_ORIGINS: 'https://plovatto.github.io,http://localhost:5173',
  CONTACT_TO: 'owner@example.com',
  RESEND_API_KEY: 're_test',
  TURNSTILE_SECRET: 'turnstile-secret',
}

const ORIGIN = 'https://plovatto.github.io'
const valid = {
  name: 'Ana',
  email: 'ana@example.com',
  message: 'Olá, vi seu portfólio!',
  token: 'turnstile-token',
  website: '',
}

function post(body: unknown, origin = ORIGIN, headers: Record<string, string> = {}) {
  return new Request('https://contact.example.workers.dev/', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function upstream({ human = true, resendOk = true } = {}) {
  return vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    const href = String(url)
    if (href.includes('turnstile')) return Response.json({ success: human })
    if (href.includes('resend')) return new Response('{}', { status: resendOk ? 200 : 500 })
    throw new Error(`unexpected fetch to ${href}`)
  })
}

const sentEmail = (fetcher: ReturnType<typeof upstream>) => {
  const call = fetcher.mock.calls.find(([url]) => String(url).includes('resend'))
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : null
}

describe('contact worker', () => {
  it('sends a valid message to the fixed recipient, as plain text, replying to the visitor', async () => {
    const fetcher = upstream()
    const response = await handleRequest(post(valid), env, fetcher)

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    const email = sentEmail(fetcher)
    expect(email.to).toEqual(['owner@example.com'])
    expect(email.reply_to).toBe('ana@example.com')
    expect(email.text).toContain('Olá, vi seu portfólio!')
    expect(email.html).toBeUndefined()
  })

  it('answers the CORS preflight only for allowed origins', async () => {
    const preflight = (origin: string) =>
      new Request('https://contact.example.workers.dev/', {
        method: 'OPTIONS',
        headers: { Origin: origin },
      })

    expect((await handleRequest(preflight(ORIGIN), env, upstream())).status).toBe(204)
    expect((await handleRequest(preflight('https://evil.example'), env, upstream())).status).toBe(
      403,
    )
  })

  it('rejects requests from other sites without calling anything', async () => {
    const fetcher = upstream()
    const response = await handleRequest(post(valid, 'https://evil.example'), env, fetcher)

    expect(response.status).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects other methods', async () => {
    const request = new Request('https://contact.example.workers.dev/', {
      method: 'GET',
      headers: { Origin: ORIGIN },
    })
    expect((await handleRequest(request, env, upstream())).status).toBe(405)
  })

  it('rejects bodies over 10 KB', async () => {
    const fetcher = upstream()
    const response = await handleRequest(
      post({ ...valid, message: 'x'.repeat(11_000) }),
      env,
      fetcher,
    )

    expect(response.status).toBe(413)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects invalid fields before verifying anything', async () => {
    const fetcher = upstream()
    for (const body of [
      { ...valid, email: 'not-an-email' },
      { ...valid, name: '   ' },
      { ...valid, message: '' },
      { ...valid, name: 'a'.repeat(101) },
      { ...valid, token: '' },
      'not json',
    ]) {
      expect((await handleRequest(post(body), env, fetcher)).status).toBe(400)
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('silently drops messages that fill the honeypot', async () => {
    const fetcher = upstream()
    const response = await handleRequest(
      post({ ...valid, website: 'https://spam.example' }),
      env,
      fetcher,
    )

    expect(response.status).toBe(200)
    expect(sentEmail(fetcher)).toBeNull()
  })

  it('refuses to send when Turnstile says it is not a human', async () => {
    const fetcher = upstream({ human: false })
    const response = await handleRequest(post(valid), env, fetcher)

    expect(response.status).toBe(403)
    expect(sentEmail(fetcher)).toBeNull()
  })

  it('verifies the token with the secret and the visitor IP', async () => {
    const fetcher = upstream()
    await handleRequest(post(valid, ORIGIN, { 'CF-Connecting-IP': '203.0.113.7' }), env, fetcher)

    const [, init] = fetcher.mock.calls[0]
    const form = (init as RequestInit).body as FormData
    expect(form.get('secret')).toBe('turnstile-secret')
    expect(form.get('response')).toBe('turnstile-token')
    expect(form.get('remoteip')).toBe('203.0.113.7')
  })

  it('removes line breaks from the name so it cannot inject e-mail headers', async () => {
    const fetcher = upstream()
    await handleRequest(post({ ...valid, name: 'Ana\r\nBcc: someone@example.com' }), env, fetcher)

    expect(sentEmail(fetcher).subject).not.toMatch(/[\r\n]/)
  })

  it('reports a generic error when the mail service fails', async () => {
    const response = await handleRequest(post(valid), env, upstream({ resendOk: false }))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ ok: false, error: 'send_failed' })
  })
})
