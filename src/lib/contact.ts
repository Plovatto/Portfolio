export interface ContactValues {
  name: string
  email: string
  message: string
}

export type ContactField = keyof ContactValues

export type ContactErrors = Partial<Record<ContactField, ContactField>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {}
  if (!values.name.trim()) errors.name = 'name'
  if (!EMAIL.test(values.email.trim())) errors.email = 'email'
  if (!values.message.trim()) errors.message = 'message'
  return errors
}

interface ContactProof {
  token: string
  website: string
}

export async function sendContact(
  values: ContactValues,
  proof: ContactProof,
): Promise<{ ms: number }> {
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT
  if (!endpoint) throw new Error('VITE_CONTACT_ENDPOINT is not configured')
  const started = performance.now()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
      token: proof.token,
      website: proof.website,
    }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new ContactError(response.status, body?.error ?? 'no_body')
  }
  return { ms: Math.round(performance.now() - started) }
}

export class ContactError extends Error {
  readonly code: string

  constructor(status: number, code: string) {
    super(`Contact endpoint answered ${status} (${code})`)
    this.name = 'ContactError'
    this.code = code
  }
}

export type ContactFailure = 'offline' | 'verify' | 'send'

export function classifyFailure(
  error: unknown,
  failedAtVerify: boolean,
  online: boolean,
): ContactFailure {
  if (!online) return 'offline'
  if (failedAtVerify || (error instanceof ContactError && error.code === 'not_human')) {
    return 'verify'
  }
  return 'send'
}
