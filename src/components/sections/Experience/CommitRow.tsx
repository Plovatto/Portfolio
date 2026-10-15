import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Commit } from '../../../constants/experience'
import { prefersReducedMotion } from '../../../hooks/useReducedMotion'
import { CommitShow } from './CommitShow'

const NODE_Y = 28
const MAIN_X = 1.2 * 16 + 1
const STUDIES_X = 2.9 * 16 + 1

interface CommitRowProps {
  commit: Commit
  first: boolean
  last: boolean
}

export function CommitRow({ commit, first, last }: CommitRowProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [lit, setLit] = useState(prefersReducedMotion)
  const [height, setHeight] = useState(0)
  const [showing, setShowing] = useState(false)
  const key = (path: string) => `experience.commits.${commit.id}.${path}`
  const items = t(key('items'), { returnObjects: true, defaultValue: [] }) as string[]
  const diff = t(key('diff'), { returnObjects: true, defaultValue: [] }) as string[]

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const enter = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLit(true)
      },
      { rootMargin: '0px 0px -30% 0px' },
    )
    const leave = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setLit(false)
    })
    enter.observe(el)
    leave.observe(el)
    return () => {
      enter.disconnect()
      leave.disconnect()
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || commit.lanes !== 'fork') return
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [commit.lanes])

  const mainTop = first ? `${NODE_Y}px` : '0'
  const mainBottom = last ? `calc(100% - ${NODE_Y}px)` : '0'

  return (
    <div ref={ref} className={`commit ${lit ? 'is-lit in' : ''}`}>
      <div className="commit-graph">
        <span className="commit-lane is-main" style={{ top: mainTop, bottom: mainBottom }} />
        {commit.lanes === 'studies-pass' && !first ? (
          <span className="commit-lane is-studies" style={{ top: 0, bottom: 0 }} />
        ) : null}
        {commit.lanes === 'main-pass' ? (
          <span className="commit-lane is-studies" style={{ top: `${NODE_Y}px`, bottom: 0 }} />
        ) : null}
        {commit.lanes === 'fork' ? (
          <>
            <span
              className="commit-lane is-studies"
              style={{ top: 0, bottom: `calc(100% - ${NODE_Y}px)` }}
            />
            {height ? (
              <svg className="commit-fork" aria-hidden="true">
                <path
                  d={`M${STUDIES_X} ${NODE_Y}V${height - 18}Q${STUDIES_X} ${height} ${MAIN_X + 12} ${height}H${MAIN_X}`}
                />
              </svg>
            ) : null}
          </>
        ) : null}
        <span className={`commit-node ${commit.lane === 'main' ? 'is-main' : 'is-studies'}`} />
      </div>
      <div className="commit-body rv">
        <div className="commit-meta">
          <span className="commit-hash">{commit.hash}</span>
          {commit.head ? <span className="commit-ref is-head">HEAD → main</span> : null}
          {commit.branchLabel ? (
            <span className="commit-ref is-branch">{t('experience.studiesLane')}</span>
          ) : null}
          <span>{t(key('date'))}</span>
          {commit.initial ? <span>{t('experience.initialCommit')}</span> : null}
        </div>
        <h3 className="display commit-title">{t(key('title'))}</h3>
        <p className="commit-org">{t(key('org'))}</p>
        {items.length ? (
          <ul className="commit-list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {diff.length ? (
          <div className="commit-diff">
            {diff.map((line) => (
              <span key={line}>+ {line}</span>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="commit-show"
          aria-haspopup="dialog"
          onClick={() => setShowing(true)}
        >
          <span aria-hidden="true">$</span> {t('experience.show')} {commit.hash}
        </button>
      </div>
      <CommitShow commit={commit} open={showing} onClose={() => setShowing(false)} />
    </div>
  )
}
