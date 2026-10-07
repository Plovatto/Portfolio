import { useEffect, useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from '../../constants/navigation'
import type { SectionId } from '../../constants/navigation'
import { prefersReducedMotion } from '../../hooks/useReducedMotion'
import { Icon } from '../ui/Icon'
import { LanguageSwitch } from './LanguageSwitch'

interface EditorTabsProps {
  active: SectionId
  messageSent: boolean
}

const INDICATOR_BASE = 100

export function EditorTabs({ active, messageSent }: EditorTabsProps) {
  const { t, i18n } = useTranslation()
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const placedRef = useRef(false)

  useLayoutEffect(() => {
    const place = () => {
      const tab = navRef.current?.querySelector<HTMLElement>(`[data-section="${active}"]`)
      const bar = indicatorRef.current
      if (!tab || !bar) return
      bar.classList.toggle('is-animated', placedRef.current)
      bar.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth / INDICATOR_BASE})`
      placedRef.current = true
    }
    place()
    document.fonts.ready.then(place)
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active, i18n.resolvedLanguage])

  useEffect(() => {
    const nav = navRef.current
    const tab = nav?.querySelector<HTMLElement>(`[data-section="${active}"]`)
    if (!nav || !tab || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollTo({
      left: tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [active])

  return (
    <div className="editor-tabs">
      <nav ref={navRef} aria-label={t('nav.sections')}>
        <span ref={indicatorRef} className="editor-tabs-indicator" aria-hidden="true" />
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            className={`editor-tab ${item.id === active ? 'is-active' : ''}`}
            href={`#${item.id}`}
            data-section={item.id}
            aria-current={item.id === active ? 'location' : undefined}
          >
            <Icon
              name={item.tabIcon}
              className={item.tabIcon === 'branch' ? 'is-git' : undefined}
            />
            {t(`nav.files.${item.id}`)}
            {item.id === 'contact' ? (
              <span
                className={`editor-tab-dot ${messageSent ? 'is-saved' : ''}`}
                title={t('nav.unsaved')}
              />
            ) : null}
          </a>
        ))}
      </nav>
      <div className="editor-tabs-actions">
        <LanguageSwitch />
      </div>
    </div>
  )
}
