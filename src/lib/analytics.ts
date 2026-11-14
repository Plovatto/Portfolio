import { getConsent, subscribeConsent } from './consent'

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] }

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    clarity?: ClarityFn
  }
}

export type AnalyticsEvent = 'contact_form_submit' | 'resume_download' | 'project_link_click'

const GA_ID_FORMAT = /^G-[A-Z0-9]+$/
const CLARITY_ID_FORMAT = /^[a-z0-9]+$/i
const COOKIE_PREFIXES = ['_ga', '_gid', '_clck', '_clsk']

function validId(value: string | undefined, format: RegExp): string | null {
  const id = value?.trim()
  return id && format.test(id) ? id : null
}

const gaId = validId(import.meta.env.VITE_GA_ID, GA_ID_FORMAT)
const clarityId = validId(import.meta.env.VITE_CLARITY_ID, CLARITY_ID_FORMAT)

export const analyticsEnabled = Boolean(gaId || clarityId)

let loaded = false
let granted = false

function gtag(..._args: unknown[]) {
  window.dataLayer?.push(arguments)
}

function injectScript(src: string) {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.append(script)
}

function setGaDisabled(disabled: boolean) {
  if (gaId) (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = disabled
}

function setClarityConsent(allowed: boolean) {
  window.clarity?.('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: allowed ? 'granted' : 'denied',
  })
}

function clearCookies() {
  const host = location.hostname
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0].trim()
    if (!COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`
    }
  }
}

function load() {
  loaded = true
  if (gaId) {
    gtag('js', new Date())
    gtag('config', gaId)
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`)
  }
  if (clarityId) {
    const queue: ClarityFn = (...args: unknown[]) => {
      ;(queue.q ??= []).push(args)
    }
    window.clarity ??= queue
    injectScript(`https://www.clarity.ms/tag/${clarityId}`)
  }
}

function grant() {
  granted = true
  setGaDisabled(false)
  gtag('consent', 'update', { analytics_storage: 'granted' })
  if (!loaded) load()
  setClarityConsent(true)
}

function revoke() {
  const wasGranted = granted
  granted = false
  if (!wasGranted) return
  setGaDisabled(true)
  gtag('consent', 'update', { analytics_storage: 'denied' })
  setClarityConsent(false)
  clearCookies()
}

function apply() {
  if (getConsent().choice === 'granted') {
    if (!granted) grant()
  } else {
    revoke()
  }
}

export function startAnalytics() {
  if (!analyticsEnabled) return
  if (gaId) {
    window.dataLayer ??= []
    window.gtag = gtag
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    })
  }
  apply()
  subscribeConsent(apply)
}

export function track(event: AnalyticsEvent, params?: Record<string, string>) {
  if (!granted) return
  if (gaId) gtag('event', event, ...(params ? [params] : []))
  window.clarity?.('event', event)
}
