import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Commit } from '../../../constants/experience'
import { PROFILE } from '../../../constants/profile'
import { WindowDialog } from '../../ui/WindowDialog'

interface CommitShowProps {
  commit: Commit
  open: boolean
  onClose: () => void
}

function lineKind(line: string) {
  if (line.startsWith('@@')) return 'is-hunk'
  if (line.startsWith('+')) return 'is-add'
  if (line.startsWith('-')) return 'is-del'
  return 'is-ctx'
}

export function CommitShow({ commit, open, onClose }: CommitShowProps) {
  const { t } = useTranslation()
  const key = (path: string) => `experience.commits.${commit.id}.${path}`
  const lines = t(key('show'), { returnObjects: true, defaultValue: [] }) as string[]
  const file = t('experience.file')

  return (
    <WindowDialog
      open={open}
      onClose={onClose}
      label={t('experience.showLabel', { hash: commit.hash })}
      className="window-git"
      title={
        <>
          <span className="window-prompt">$</span> git show {commit.hash}
        </>
      }
    >
      <div className="git-show">
        <p className="git-show-meta">
          <span className="git-show-hash">commit {commit.hash}</span>
          {commit.head ? <span className="git-show-ref"> (HEAD → main)</span> : null}
        </p>
        <p className="git-show-meta">Author: {PROFILE.fullName}</p>
        <p className="git-show-meta">Date: {t(key('date'))}</p>
        <p className="git-show-message">{t(key('title'))}</p>
        <p className="git-show-message is-org">{t(key('org'))}</p>
        <p className="git-show-file">
          diff --git a/{file} b/{file}
        </p>
        <ol className="git-show-diff">
          {lines.map((line, i) => (
            <li
              key={`${i}-${line}`}
              className={lineKind(line)}
              style={{ '--i': i } as CSSProperties}
            >
              {line}
            </li>
          ))}
        </ol>
      </div>
    </WindowDialog>
  )
}
