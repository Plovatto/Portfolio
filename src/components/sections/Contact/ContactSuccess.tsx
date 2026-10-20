import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface ContactSuccessProps {
  name: string
  email: string
  onAgain: () => void
}

export function ContactSuccess({ name, email, onAgain }: ContactSuccessProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div ref={ref} className="contact-success" role="status" tabIndex={-1}>
      <svg className="contact-success-mark" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" />
        <path d="M15 24.5l6 6 12-13" />
      </svg>
      <p className="contact-success-title">{t('contact.success.title')}</p>
      <p className="contact-success-body">{t('contact.success.body', { name, email })}</p>
      <button type="button" className="btn" onClick={onAgain}>
        {t('contact.success.again')}
      </button>
    </div>
  )
}
