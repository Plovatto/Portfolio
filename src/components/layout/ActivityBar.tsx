import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from '../../constants/navigation'
import type { SectionId } from '../../constants/navigation'
import { PROFILE } from '../../constants/profile'
import { useTheme } from '../../hooks/useTheme'
import { circularTransition } from '../../lib/viewTransition'
import { Icon } from '../ui/Icon'

interface ActivityBarProps {
  active: SectionId
}

export function ActivityBar({ active }: ActivityBarProps) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="activity-bar" aria-label={t('nav.label')}>
      <a
        className="activity-logo"
        href="#home"
        aria-label={`${PROFILE.monogram}, ${t('nav.home')}`}
      >
        {PROFILE.monogram}
      </a>
      {NAV_ITEMS.map((item) => {
        const tip = item.id === 'experience' ? t('nav.tips.experience') : t(`nav.files.${item.id}`)
        return (
          <a
            key={item.id}
            className={`activity-item ${item.id === active ? 'is-active' : ''}`}
            href={`#${item.id}`}
            aria-current={item.id === active ? 'location' : undefined}
            aria-label={tip}
          >
            <Icon name={item.icon} />
            <span className="activity-tip" aria-hidden="true">
              {tip}
            </span>
          </a>
        )
      })}
      <span className="activity-spacer" />
      <button
        className="activity-item"
        type="button"
        aria-label={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')}
        onClick={(e) => circularTransition(e.currentTarget, toggleTheme)}
      >
        <span className="theme-icons" aria-hidden="true">
          <Icon name="sun" className="theme-icon is-sun" />
          <Icon name="moon" className="theme-icon is-moon" />
        </span>
        <span className="activity-tip" aria-hidden="true">
          {t('nav.toggleTheme')}
        </span>
      </button>
    </aside>
  )
}
