import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { PROFILE } from '../../../constants/profile'
import { prefersReducedMotion } from '../../../hooks/useReducedMotion'
import { unlockIntroScroll } from '../../../lib/introLock'

export type OpeningStage = 'idle' | 'writing' | 'compiling' | 'ready'

interface CodeIntroProps {
  nameTarget: RefObject<SVGSVGElement | null>
  onStage: (stage: OpeningStage) => void
  onCompiled: () => void
}

const LINE_INTERVAL = 65
const BEFORE_PICK = 250
const BEFORE_FLIGHT = 500
const FLIGHT_MS = 760
const WINDOW_IN = 280
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(id)
      reject(signal.reason)
    })
  })

const k = (text: string) => <span className="tok-keyword">{text}</span>
const c = (text: string) => <span className="tok-component">{text}</span>
const s = (text: string) => <span className="tok-string">{text}</span>
const a = (text: string) => <span className="tok-attr">{text}</span>

function sourceLines(component: string, role: string, name: ReactNode): ReactNode[] {
  return [
    <>
      {k('import')} {'{'} {c('Board')}, {c('Chip')}, {c('Terminal')} {'}'} {k('from')}{' '}
      {s("'@/board'")}
    </>,
    '',
    <>
      {k('export function')} <span className="tok-fn">{component}</span>() {'{'}
    </>,
    <>
      {'  '}
      {k('return')} (
    </>,
    <>
      {'    '}&lt;{c('Board')} {a('power')}={s('"on"')}&gt;
    </>,
    <>
      {'      '}&lt;{c('Chip')} {a('pins')}={s('"tb"')}&gt;
    </>,
    <>
      {'        '}
      {name}
    </>,
    <>
      {'      '}&lt;/{c('Chip')}&gt;
    </>,
    <>
      {'      '}&lt;{c('Role')}&gt;{role}&lt;/{c('Role')}&gt;
    </>,
    <>
      {'      '}&lt;{c('Terminal')} {a('boot')} /&gt;
    </>,
    <>
      {'    '}&lt;/{c('Board')}&gt;
    </>,
    '  )',
    '}',
  ]
}

export function CodeIntro({ nameTarget, onStage, onCompiled }: CodeIntroProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const viewRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<HTMLPreElement>(null)
  const tokenRef = useRef<HTMLSpanElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<HTMLSpanElement | null>(null)
  const progressRef = useRef<HTMLElement>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const compiledRef = useRef(false)
  const callbacks = useRef({ onStage, onCompiled })
  useLayoutEffect(() => {
    callbacks.current = { onStage, onCompiled }
  })

  const finish = () => {
    if (compiledRef.current) return
    compiledRef.current = true
    unlockIntroScroll()
    callbacks.current.onStage('ready')
    callbacks.current.onCompiled()
  }

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    const { signal } = controller

    const play = async () => {
      await document.fonts.ready
      if (signal.aborted) return
      if (prefersReducedMotion()) {
        finish()
        return
      }
      const pre = linesRef.current
      const lines = [...(pre?.children ?? [])] as HTMLElement[]
      const caret = document.createElement('span')
      caret.className = 'code-caret'
      caret.setAttribute('aria-hidden', 'true')
      caretRef.current = caret
      signal.addEventListener('abort', () => caret.remove())
      const progress = progressRef.current
      const totalWriting = lines.length * LINE_INTERVAL + BEFORE_PICK

      setOpen(true)
      callbacks.current.onStage('writing')
      windowRef.current?.animate(
        [
          { opacity: 0, transform: 'translateY(12px) scale(0.96)', filter: 'blur(8px)' },
          { opacity: 1, transform: 'none', filter: 'blur(0)' },
        ],
        { duration: 520, easing: EASE_OUT },
      )
      progress?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(0.72)' }], {
        duration: totalWriting,
        easing: 'linear',
        fill: 'forwards',
      })
      await wait(WINDOW_IN, signal)

      for (const line of lines) {
        line.classList.add('is-written')
        line.lastElementChild?.append(caret)
        line.animate(
          [
            { clipPath: 'inset(0 100% 0 0)', opacity: 0.4 },
            { clipPath: 'inset(0 0 0 0)', opacity: 1 },
          ],
          { duration: 260, easing: EASE_OUT },
        )
        await wait(LINE_INTERVAL, signal)
      }
      await wait(BEFORE_PICK, signal)

      caret.remove()
      tokenRef.current?.classList.add('is-picked')
      pre?.classList.add('is-compiling')
      callbacks.current.onStage('compiling')
      progress?.animate([{ transform: 'scaleX(0.72)' }, { transform: 'scaleX(1)' }], {
        duration: BEFORE_FLIGHT,
        easing: EASE_OUT,
        fill: 'forwards',
      })
      await wait(BEFORE_FLIGHT, signal)
      await flyName(signal)
      finish()
    }

    const flyName = async (abort: AbortSignal) => {
      const token = tokenRef.current
      const target = nameTarget.current
      const view = viewRef.current
      if (!token || !target || !view) return
      const from = token.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      const flyer = document.createElement('span')
      flyer.className = 'code-flyer'
      flyer.textContent = PROFILE.name
      flyer.style.fontSize = getComputedStyle(token).fontSize
      flyer.style.left = `${from.left}px`
      flyer.style.top = `${from.top}px`
      document.body.append(flyer)
      abort.addEventListener('abort', () => flyer.remove())
      const scale = to.width / flyer.getBoundingClientRect().width
      const dx = to.left - from.left
      const dy = to.top - from.top

      windowRef.current?.animate(
        [
          { opacity: 1, transform: 'none', filter: 'blur(0)' },
          { opacity: 0, transform: 'scale(0.97)', filter: 'blur(6px)' },
        ],
        { duration: 460, delay: 80, easing: EASE_OUT, fill: 'forwards' },
      )
      view
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 520,
          delay: 160,
          easing: EASE_OUT,
          fill: 'forwards',
        })
        .finished.then((animation) => {
          setOpen(false)
          animation.cancel()
          windowRef.current?.getAnimations().forEach((a) => a.cancel())
          token.classList.remove('is-picked')
          linesRef.current?.classList.remove('is-compiling')
        })
      await flyer.animate(
        [
          { transform: 'none', filter: 'blur(0)' },
          {
            transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 24}px) scale(${1 + (scale - 1) * 0.5})`,
            filter: 'blur(1.5px)',
            offset: 0.5,
          },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, filter: 'blur(0)' },
        ],
        { duration: FLIGHT_MS, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
      ).finished
      landingRing(to)
      flyer
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' })
        .finished.then(() => flyer.remove())
    }

    play().catch(() => {})
    return () => controller.abort()
  }, [nameTarget])

  const skip = () => {
    controllerRef.current?.abort()
    caretRef.current?.remove()
    setOpen(false)
    finish()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const name = (
    <span ref={tokenRef} className="tok-name">
      {PROFILE.name}
    </span>
  )

  return (
    <div ref={viewRef} className={`code-view ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div ref={windowRef} className="code-window">
        <div className="code-header">
          <span>{t('hero.codeFile')}</span>
          <button type="button" onClick={skip} tabIndex={open ? 0 : -1}>
            {t('hero.closeCode')}
          </button>
          <span className="code-progress" aria-hidden="true">
            <i ref={progressRef} />
          </span>
        </div>
        <pre ref={linesRef}>
          {sourceLines(t('hero.codeComponent'), t('hero.role'), name).map((line, i) => (
            <span key={i} className="code-line">
              <b>{i + 1}</b>
              <span>{line === '' ? ' ' : line}</span>
            </span>
          ))}
        </pre>
      </div>
    </div>
  )
}

function landingRing(target: DOMRect) {
  const ring = document.createElement('span')
  ring.className = 'code-landing'
  ring.style.left = `${target.left + target.width / 2}px`
  ring.style.top = `${target.top + target.height / 2}px`
  ring.style.width = `${target.width}px`
  ring.style.height = `${target.height * 2.4}px`
  document.body.append(ring)
  ring
    .animate(
      [
        { opacity: 0.9, transform: 'translate(-50%, -50%) scale(0.6)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(1.25)' },
      ],
      { duration: 700, easing: EASE_OUT, fill: 'forwards' },
    )
    .finished.then(() => ring.remove())
}
