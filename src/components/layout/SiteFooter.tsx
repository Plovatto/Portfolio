import { useTranslation } from 'react-i18next'
import { PROFILE } from '../../constants/profile'
import { useReveal } from '../../hooks/useReveal'
import { analyticsEnabled } from '../../lib/analytics'
import { reopenConsent } from '../../lib/consent'
import { privacyUrl } from '../../lib/privacy'

const CURRENT_YEAR = new Date().getFullYear()

export function SiteFooter() {
  const { t } = useTranslation()
  const ref = useReveal<HTMLElement>()

  return (
    <footer ref={ref} className="site-footer rv-fade" data-quiet>
      <div className="wrap">
        <span>{t('footer.copyright', { year: CURRENT_YEAR })}</span>
        <nav aria-label={t('footer.label')}>
          <a href={PROFILE.github}>GitHub</a>
          {PROFILE.linkedin ? <a href={PROFILE.linkedin}>LinkedIn</a> : null}
          <a href={privacyUrl()}>{t('footer.privacy')}</a>
          {analyticsEnabled ? (
            <button type="button" onClick={reopenConsent}>
              {t('footer.cookies')}
            </button>
          ) : null}
        </nav>
      </div>
    </footer>
  )
}
