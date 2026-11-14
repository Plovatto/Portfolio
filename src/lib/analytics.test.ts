import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GA_ID = 'G-TEST123'
const CLARITY_ID = 'clarity123'
const GA_SCRIPT = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
const CLARITY_SCRIPT = `https://www.clarity.ms/tag/${CLARITY_ID}`
const DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
}

async function load(ids: { ga?: string; clarity?: string } = {}) {
  vi.resetModules()
  vi.stubEnv('VITE_GA_ID', ids.ga ?? '')
  vi.stubEnv('VITE_CLARITY_ID', ids.clarity ?? '')
  const consent = await import('./consent')
  const analytics = await import('./analytics')
  const reload = vi.fn()
  return { consent, analytics, reload, start: () => analytics.startAnalytics(reload) }
}

const scripts = () => [...document.querySelectorAll('script')].map((script) => script.src)
const calls = () => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>))
const events = () => calls().filter(([command]) => command === 'event')
const gaDisabled = () => (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]

function clearAllCookies() {
  for (const entry of document.cookie.split(';')) {
    document.cookie = `${entry.split('=')[0].trim()}=; Max-Age=0; path=/`
  }
}

beforeEach(() => {
  localStorage.clear()
  clearAllCookies()
  document.head.innerHTML = ''
  delete window.dataLayer
  delete window.gtag
  delete window.clarity
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('analytics', () => {
  it('loads nothing and stays disabled when no id is configured', async () => {
    const { consent, analytics, start } = await load()
    start()
    consent.decideConsent('granted')
    analytics.track('resume_download')

    expect(analytics.analyticsEnabled).toBe(false)
    expect(scripts()).toEqual([])
    expect(window.dataLayer).toBeUndefined()
    expect(window.clarity).toBeUndefined()
  })

  it('ignores ids that do not look like real ones', async () => {
    const { consent, analytics, start } = await load({ ga: 'UA-1"><script>', clarity: '../evil' })
    start()
    consent.decideConsent('granted')

    expect(analytics.analyticsEnabled).toBe(false)
    expect(scripts()).toEqual([])
  })

  it('starts with every consent signal denied and no script before a choice', async () => {
    const { analytics, start } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    start()

    expect(analytics.analyticsEnabled).toBe(true)
    expect(scripts()).toEqual([])
    expect(window.clarity).toBeUndefined()
    expect(calls()).toEqual([['consent', 'default', DENIED]])
  })

  it('loads nothing after a refusal and drops events', async () => {
    const { consent, analytics, reload, start } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    start()
    consent.decideConsent('denied')
    analytics.track('resume_download')

    expect(scripts()).toEqual([])
    expect(events()).toEqual([])
    expect(reload).not.toHaveBeenCalled()
  })

  it('loads both scripts once after acceptance, granting analytics storage only', async () => {
    const { consent, start } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    start()
    consent.decideConsent('granted')
    consent.reopenConsent()
    consent.decideConsent('granted')

    expect(scripts()).toEqual([GA_SCRIPT, CLARITY_SCRIPT])
    expect(calls()).toEqual([
      ['consent', 'default', DENIED],
      ['consent', 'update', { analytics_storage: 'granted' }],
      ['js', expect.any(Date)],
      ['config', GA_ID],
    ])
    expect(window.clarity?.q).toEqual([
      ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }],
    ])
  })

  it('queues commands the way gtag.js reads them, as arguments objects', async () => {
    const { start } = await load({ ga: GA_ID })
    start()

    expect(Object.prototype.toString.call(window.dataLayer?.[0])).toBe('[object Arguments]')
  })

  it('works with Clarity alone, without creating the Google queue', async () => {
    const { consent, analytics, start } = await load({ clarity: CLARITY_ID })
    start()
    consent.decideConsent('granted')
    analytics.track('resume_download')

    expect(scripts()).toEqual([CLARITY_SCRIPT])
    expect(window.dataLayer).toBeUndefined()
    expect(window.gtag).toBeUndefined()
    expect(window.clarity?.q).toContainEqual(['event', 'resume_download'])
  })

  it('loads right away for a returning visitor who already accepted', async () => {
    localStorage.setItem('portfolio-consent', 'granted')
    const { start } = await load({ ga: GA_ID })
    start()

    expect(scripts()).toEqual([GA_SCRIPT])
  })

  it('loads nothing and clears leftover cookies for a returning visitor who refused', async () => {
    localStorage.setItem('portfolio-consent', 'denied')
    document.cookie = '_ga=GA1.1.1.1'
    document.cookie = 'unrelated=keep'
    const { reload, start } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    start()

    expect(scripts()).toEqual([])
    expect(document.cookie).toBe('unrelated=keep')
    expect(reload).not.toHaveBeenCalled()
  })

  it('sends events only while consent is granted', async () => {
    const { consent, analytics, start } = await load({ ga: GA_ID })
    start()

    analytics.track('project_link_click', { project: 'sparkchat', link_type: 'app' })
    expect(events()).toEqual([])

    consent.decideConsent('granted')
    analytics.track('project_link_click', { project: 'sparkchat', link_type: 'app' })
    analytics.track('resume_download')
    expect(events()).toEqual([
      ['event', 'project_link_click', { project: 'sparkchat', link_type: 'app' }],
      ['event', 'resume_download'],
    ])
  })

  it('stops measuring, clears its cookies and reloads when consent is withdrawn', async () => {
    const { consent, analytics, reload, start } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    start()
    consent.decideConsent('granted')
    document.cookie = '_ga=GA1.1.1.1'
    document.cookie = '_ga_TEST123=GS1.1.1'
    document.cookie = '_clck=abc'
    document.cookie = 'unrelated=keep'
    const clarity = vi.fn()
    window.clarity = clarity
    const written: string[] = []
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!
    vi.spyOn(document, 'cookie', 'set').mockImplementation((value) => {
      written.push(value)
      cookie.set!.call(document, value)
    })

    consent.decideConsent('denied')
    analytics.track('resume_download')

    expect(calls()).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }])
    expect(gaDisabled()).toBe(true)
    expect(clarity).toHaveBeenCalledWith('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: 'denied',
    })
    expect(document.cookie).toBe('unrelated=keep')
    expect(written).toContain('_ga=; Max-Age=0; path=/')
    expect(written).toContain(`_ga=; Max-Age=0; path=/; domain=${location.hostname}`)
    expect(written).toContain(`_clck=; Max-Age=0; path=/; domain=.${location.hostname}`)
    expect(written.some((value) => value.startsWith('unrelated='))).toBe(false)
    expect(events()).toEqual([])
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('follows a withdrawal made in another tab', async () => {
    const { consent, analytics, reload, start } = await load({ ga: GA_ID })
    start()
    consent.decideConsent('granted')

    localStorage.setItem('portfolio-consent', 'denied')
    window.dispatchEvent(new StorageEvent('storage', { key: 'portfolio-consent' }))
    analytics.track('resume_download')

    expect(consent.getConsent().choice).toBe('denied')
    expect(gaDisabled()).toBe(true)
    expect(events()).toEqual([])
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
