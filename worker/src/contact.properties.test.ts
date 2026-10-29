import fc from 'fast-check'
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
const STATUSES = [200, 400, 403, 413, 502]

function post(body: string, origin = ORIGIN) {
  return new Request('https://contact.example.workers.dev/', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body,
  })
}

function upstream() {
  return vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    const href = String(url)
    if (href.includes('turnstile')) return Response.json({ success: true })
    if (href.includes('resend')) return new Response('{}', { status: 200 })
    throw new Error(`unexpected fetch to ${href}`)
  })
}

const sentEmail = (fetcher: ReturnType<typeof upstream>) => {
  const call = fetcher.mock.calls.find(([url]) => String(url).includes('resend'))
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : null
}

describe('contact worker properties', () => {
  it('rejects every origin outside the allow list without calling upstream services', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl().filter((url) => !env.ALLOWED_ORIGINS.split(',').includes(url)),
        async (origin) => {
          const fetcher = upstream()
          const response = await handleRequest(post('{}', origin), env, fetcher)

          expect(response.status).toBe(403)
          expect(fetcher).not.toHaveBeenCalled()
        },
      ),
    )
  })

  it('answers any body with a known status and never sends email to another recipient', async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(fc.string(), fc.json()), async (body) => {
        const fetcher = upstream()
        const response = await handleRequest(post(body), env, fetcher)

        expect(STATUSES).toContain(response.status)
        const email = sentEmail(fetcher)
        if (email) expect(email.to).toEqual([env.CONTACT_TO])
      }),
    )
  })

  it('never lets line breaks from the visitor reach the email subject', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 100 }), async (name) => {
        const fetcher = upstream()
        const body = JSON.stringify({
          name,
          email: 'ana@example.com',
          message: 'Olá!',
          token: 'turnstile-token',
          website: '',
        })
        await handleRequest(post(body), env, fetcher)

        const email = sentEmail(fetcher)
        if (email) expect(email.subject).not.toMatch(/[\r\n]/)
      }),
    )
  })
})
