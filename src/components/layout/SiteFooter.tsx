import { useTranslation } from 'react-i18next'
import { PROFILE } from '../../constants/profile'
import { useReveal } from '../../hooks/useReveal'

export function SiteFooter() {
  const { t } = useTranslation()
  const ref = useReveal<HTMLElement>()

  return (
    <footer ref={ref} className="site-footer rv-fade" data-quiet>
      <div className="wrap">
        <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
        <nav>
          <a href={PROFILE.github}>GitHub</a>
          {PROFILE.linkedin ? <a href={PROFILE.linkedin}>LinkedIn</a> : null}
        </nav>
      </div>
    </footer>
  )
}
