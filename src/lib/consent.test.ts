import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'portfolio-consent'

async function load() {
  vi.resetModules()
  return import('./consent')
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('consent', () => {
  it('asks on the first visit, with nothing decided', async () => {
    const consent = await load()

    expect(consent.getConsent()).toMatchObject({ choice: null, asking: true })
  })

  it('remembers an accepted choice across visits and stops asking', async () => {
    const first = await load()
    first.decideConsent('granted')

    expect(localStorage.getItem(KEY)).toBe('granted')
    expect(first.getConsent()).toMatchObject({ choice: 'granted', asking: false })

    const second = await load()
    expect(second.getConsent()).toMatchObject({ choice: 'granted', asking: false })
  })

  it('remembers a refusal just as firmly', async () => {
    const first = await load()
    first.decideConsent('denied')

    const second = await load()
    expect(second.getConsent()).toMatchObject({ choice: 'denied', asking: false })
  })

  it('treats an unknown stored value as no decision', async () => {
    localStorage.setItem(KEY, 'yes please')
    const consent = await load()

    expect(consent.getConsent()).toMatchObject({ choice: null, asking: true })
  })

  it('asks again on request while keeping the current choice until a new one is made', async () => {
    const consent = await load()
    consent.decideConsent('granted')
    consent.reopenConsent()

    expect(consent.getConsent()).toMatchObject({ choice: 'granted', asking: true })

    consent.decideConsent('denied')
    expect(consent.getConsent()).toMatchObject({ choice: 'denied', asking: false })
    expect(localStorage.getItem(KEY)).toBe('denied')
  })

  it('notifies subscribers on every change and stops after unsubscribing', async () => {
    const consent = await load()
    const listener = vi.fn()
    const unsubscribe = consent.subscribeConsent(listener)

    consent.decideConsent('granted')
    consent.reopenConsent()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    consent.decideConsent('denied')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('counts every request to ask again, even while already asking', async () => {
    const consent = await load()
    expect(consent.getConsent().requests).toBe(0)

    consent.reopenConsent()
    consent.reopenConsent()

    expect(consent.getConsent()).toMatchObject({ choice: null, asking: true, requests: 2 })
  })

  it('picks up a choice made in another tab', async () => {
    const consent = await load()
    const listener = vi.fn()
    consent.subscribeConsent(listener)
    expect(consent.getConsent().choice).toBeNull()

    localStorage.setItem(KEY, 'denied')
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    expect(consent.getConsent()).toMatchObject({ choice: 'denied', asking: false })

    window.dispatchEvent(new StorageEvent('storage', { key: 'portfolio-theme' }))
    expect(listener).toHaveBeenCalledTimes(1)

    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(consent.getConsent()).toMatchObject({ choice: null, asking: true })
  })

  it('keeps the same snapshot object while nothing changes', async () => {
    const consent = await load()

    expect(consent.getConsent()).toBe(consent.getConsent())
  })

  it('still works for the session when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const consent = await load()

    expect(consent.getConsent()).toMatchObject({ choice: null, asking: true })
    expect(() => consent.decideConsent('granted')).not.toThrow()
    expect(consent.getConsent()).toMatchObject({ choice: 'granted', asking: false })
  })
})
