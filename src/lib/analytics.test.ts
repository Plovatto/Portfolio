import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GA_ID = 'G-TEST123'
const CLARITY_ID = 'clarity123'

async function load(ids: { ga?: string; clarity?: string } = {}) {
  vi.resetModules()
  vi.stubEnv('VITE_GA_ID', ids.ga ?? '')
  vi.stubEnv('VITE_CLARITY_ID', ids.clarity ?? '')
  const consent = await import('./consent')
  const analytics = await import('./analytics')
  return { consent, analytics }
}

const scripts = () => [...document.querySelectorAll('script')].map((script) => script.src)
const calls = () => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>))

beforeEach(() => {
  localStorage.clear()
  document.head.innerHTML = ''
  document.body.innerHTML = '<script></script>'
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
    const { consent, analytics } = await load()
    analytics.startAnalytics()
    consent.decideConsent('granted')
    analytics.track('resume_download')

    expect(analytics.analyticsEnabled).toBe(false)
    expect(scripts().filter(Boolean)).toEqual([])
    expect(window.dataLayer).toBeUndefined()
    expect(window.clarity).toBeUndefined()
  })

  it('ignores ids that do not look like real ones', async () => {
    const { consent, analytics } = await load({ ga: 'UA-1"><script>', clarity: '../evil' })
    analytics.startAnalytics()
    consent.decideConsent('granted')

    expect(analytics.analyticsEnabled).toBe(false)
    expect(scripts().filter(Boolean)).toEqual([])
  })

  it('starts with every consent signal denied and no script before a choice', async () => {
    const { analytics } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    analytics.startAnalytics()

    expect(analytics.analyticsEnabled).toBe(true)
    expect(scripts().filter(Boolean)).toEqual([])
    expect(calls()).toEqual([
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
    ])
  })

  it('loads nothing after a refusal and drops events', async () => {
    const { consent, analytics } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    analytics.startAnalytics()
    consent.decideConsent('denied')
    analytics.track('resume_download')

    expect(scripts().filter(Boolean)).toEqual([])
    expect(calls().some(([command]) => command === 'event')).toBe(false)
  })

  it('loads both scripts once after acceptance, granting analytics storage only', async () => {
    const { consent, analytics } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    analytics.startAnalytics()
    consent.decideConsent('granted')
    consent.reopenConsent()
    consent.decideConsent('granted')

    expect(scripts().filter(Boolean)).toEqual([
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
      `https://www.clarity.ms/tag/${CLARITY_ID}`,
    ])
    expect(calls()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }])
    expect(calls()).toContainEqual(['config', GA_ID])
    expect(JSON.stringify(calls())).not.toContain('"ad_storage":"granted"')
  })

  it('loads right away for a returning visitor who already accepted', async () => {
    localStorage.setItem('portfolio-consent', 'granted')
    const { analytics } = await load({ ga: GA_ID })
    analytics.startAnalytics()

    expect(scripts().filter(Boolean)).toEqual([
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
    ])
  })

  it('sends events only while consent is granted', async () => {
    const { consent, analytics } = await load({ ga: GA_ID })
    analytics.startAnalytics()

    analytics.track('project_link_click', { project: 'sparkchat', link_type: 'app' })
    expect(calls().some(([command]) => command === 'event')).toBe(false)

    consent.decideConsent('granted')
    analytics.track('project_link_click', { project: 'sparkchat', link_type: 'app' })
    expect(calls()).toContainEqual([
      'event',
      'project_link_click',
      { project: 'sparkchat', link_type: 'app' },
    ])
  })

  it('stops measuring and clears its cookies when consent is withdrawn', async () => {
    const { consent, analytics } = await load({ ga: GA_ID, clarity: CLARITY_ID })
    analytics.startAnalytics()
    consent.decideConsent('granted')
    document.cookie = '_ga=GA1.1.1.1'
    document.cookie = '_ga_TEST123=GS1.1.1'
    document.cookie = '_clck=abc'
    document.cookie = 'unrelated=keep'
    const clarity = vi.fn()
    window.clarity = clarity

    consent.decideConsent('denied')
    analytics.track('resume_download')

    expect(calls()).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }])
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]).toBe(true)
    expect(clarity).toHaveBeenCalledWith('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: 'denied',
    })
    expect(document.cookie).toBe('unrelated=keep')
    expect(calls().some(([command]) => command === 'event')).toBe(false)

    consent.decideConsent('granted')
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]).toBe(false)
    expect(scripts().filter(Boolean)).toHaveLength(2)
  })
})
