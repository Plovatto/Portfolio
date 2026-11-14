import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useConsent } from '../../hooks/useConsent'
import { analyticsEnabled } from '../../lib/analytics'
import { decideConsent } from '../../lib/consent'
import type { ConsentChoice } from '../../lib/consent'
import { privacyUrl } from '../../lib/privacy'

export function ConsentBanner() {
  const { t } = useTranslation()
  const { choice, asking } = useConsent()
  const ref = useRef<HTMLElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const reopened = asking && choice !== null

  useEffect(() => {
    if (!reopened) return
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.focus()
  }, [reopened])

  if (!analyticsEnabled || !asking) return null

  const decide = (next: ConsentChoice) => {
    decideConsent(next)
    if (returnTo.current?.isConnected) returnTo.current.focus()
    returnTo.current = null
  }

  return (
    <section ref={ref} className="consent" aria-labelledby="consent-title" tabIndex={-1}>
      <h2 id="consent-title" className="consent-title">
        {t('consent.title')}
      </h2>
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
