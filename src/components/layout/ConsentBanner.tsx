import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useConsent } from '../../hooks/useConsent'
import { analyticsEnabled } from '../../lib/analytics'
import { decideConsent } from '../../lib/consent'
import type { ConsentChoice } from '../../lib/consent'
import { privacyUrl } from '../../lib/privacy'

export function ConsentBanner() {
  const { t } = useTranslation()
  const { asking, requests } = useConsent()
  const ref = useRef<HTMLElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const banner = ref.current
    if (!banner || requests === 0) return
    const focused = document.activeElement
    if (focused instanceof HTMLElement && focused !== document.body && !banner.contains(focused)) {
      returnTo.current = focused
    }
    banner.focus()
  }, [requests])

  if (!analyticsEnabled || !asking) return null

  const decide = (next: ConsentChoice) => {
    const target = returnTo.current?.isConnected
      ? returnTo.current
      : document.getElementById('main')
    returnTo.current = null
    decideConsent(next)
    target?.focus({ preventScroll: true })
  }

  return (
    <section ref={ref} className="consent" aria-labelledby="consent-title" tabIndex={-1}>
      <p id="consent-title" className="consent-title">
        {t('consent.title')}
      </p>
      <p>
        {t('consent.text')} <a href={privacyUrl()}>{t('consent.privacy')}</a>
      </p>
      <div className="consent-actions">
        <button type="button" className="btn" onClick={() => decide('denied')}>
          {t('consent.decline')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => decide('granted')}>
          {t('consent.accept')}
        </button>
      </div>
    </section>
  )
}
