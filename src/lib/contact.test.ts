import { describe, expect, it } from 'vitest'
import { ContactError, classifyFailure, validateContact } from './contact'

const valid = { name: 'Ana', email: 'ana@example.com', message: 'Olá!' }

describe('validateContact', () => {
  it('accepts a complete message', () => {
    expect(validateContact(valid)).toEqual({})
  })

  it('requires every field, ignoring surrounding spaces', () => {
    expect(validateContact({ name: '  ', email: '', message: '\n' })).toEqual({
      name: 'name',
      email: 'email',
      message: 'message',
    })
  })

  it('rejects an e-mail without a domain', () => {
    expect(validateContact({ ...valid, email: 'ana@' })).toEqual({ email: 'email' })
    expect(validateContact({ ...valid, email: 'ana.example.com' })).toEqual({ email: 'email' })
  })
})

describe('classifyFailure', () => {
  it('blames the connection first when the browser is offline', () => {
    expect(classifyFailure(new TypeError('Failed to fetch'), false, false)).toBe('offline')
  })

  it('reports the anti-bot check, on the page or on the server', () => {
    expect(classifyFailure(new Error('Turnstile check failed'), true, true)).toBe('verify')
    expect(classifyFailure(new ContactError(403, 'not_human'), false, true)).toBe('verify')
  })

  it('falls back to a generic send failure', () => {
    expect(classifyFailure(new ContactError(502, 'send_failed'), false, true)).toBe('send')
    expect(classifyFailure(new TypeError('Failed to fetch'), false, true)).toBe('send')
  })
})
