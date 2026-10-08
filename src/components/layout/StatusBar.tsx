import { useTranslation } from 'react-i18next'
import type { SectionId } from '../../constants/navigation'
import { Icon } from '../ui/Icon'

interface StatusBarProps {
  active: SectionId
  build: string
}

export function StatusBar({ active, build }: StatusBarProps) {
  const { t } = useTranslation()

  return (
    <footer className="status-bar" aria-label={t('statusBar.label')}>
      <span>
        <Icon name="branch" />
        main
      </span>
      <span className="hide-sm">{build}</span>
      <span className="hide-sm">{t(`nav.files.${active}`)}</span>
    </footer>
  )
}
