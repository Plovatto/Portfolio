interface TurnstileOptions {
  sitekey: string
  execution: 'render' | 'execute'
  appearance: 'always' | 'execute' | 'interaction-only'
  callback: (token: string) => void
  'error-callback': (code?: string) => void
  'expired-callback': () => void
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string
  execute(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable'))
    script.onerror = () => {
      loading = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.append(script)
  })
  return loading
}

export async function getTurnstileToken(container: HTMLElement): Promise<string> {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  if (!siteKey) throw new Error('VITE_TURNSTILE_SITE_KEY is not configured')
  const turnstile = await loadTurnstile()
  return new Promise((resolve, reject) => {
    const widgetId = turnstile.render(container, {
      sitekey: siteKey,
      execution: 'execute',
      appearance: 'interaction-only',
      callback: (token) => {
        resolve(token)
        turnstile.remove(widgetId)
      },
      'error-callback': (code) => {
        reject(new Error(`Turnstile check failed (${code ?? 'no code'})`))
        turnstile.remove(widgetId)
      },
      'expired-callback': () => reject(new Error('Turnstile token expired')),
    })
    turnstile.execute(widgetId)
  })
}
