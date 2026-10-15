import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import './window.css'

interface WindowDialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  label: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function WindowDialog({
  open,
  onClose,
  title,
  label,
  actions,
  className = '',
  children,
}: WindowDialogProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`window ${className}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="window-frame">
        <header className="window-bar">
          <span className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="window-title">{title}</div>
          <div className="window-actions">
            {actions}
            <button type="button" className="window-button" onClick={onClose}>
              {t('window.close')}
            </button>
          </div>
        </header>
        <div className="window-body">{open ? children : null}</div>
      </div>
    </dialog>
  )
}
