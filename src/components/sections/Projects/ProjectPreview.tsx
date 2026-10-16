import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WindowDialog } from '../../ui/WindowDialog'

interface ProjectPreviewProps {
  name: string
  url: string
  open: boolean
  onClose: () => void
}

export function ProjectPreview({ name, url, open, onClose }: ProjectPreviewProps) {
  const { t } = useTranslation()
  const [version, setVersion] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const address = url.replace(/^https?:\/\//, '')

  const reload = () => {
    setLoaded(false)
    setVersion((v) => v + 1)
  }

  const close = () => {
    setLoaded(false)
    onClose()
  }

  return (
    <WindowDialog
      open={open}
      onClose={close}
      label={t('projects.runLabel', { name })}
      className="window-browser"
      title={
        <span className="window-address">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <span className="window-address-text">{address}</span>
        </span>
      }
      actions={
        <>
          <button type="button" className="window-button" onClick={reload}>
            {t('projects.reload')}
          </button>
          <a className="window-button" href={url} target="_blank" rel="noreferrer">
            {t('projects.newTab')}
          </a>
        </>
      }
    >
      <div className={`window-viewport ${loaded ? 'is-loaded' : ''}`}>
        <span className="window-loading" role="status">
          {t('projects.loading')}
        </span>
        <iframe
          key={version}
          src={url}
          title={t('projects.runLabel', { name })}
          onLoad={() => setLoaded(true)}
          allow="clipboard-write; microphone; camera"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </WindowDialog>
  )
}
