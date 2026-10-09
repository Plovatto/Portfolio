import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { typeSegments } from '../../../lib/typewriter'
import type { Segment } from '../../../lib/typewriter'
import { Chip } from '../../ui/Chip'
import {
  COMMAND_TARGETS,
  TERMINAL_COMMANDS,
  bootOutput,
  commandOutput,
  typedCommand,
} from './terminalOutput'
import type { TerminalCommand } from './terminalOutput'

export const BOOT_MS = 312

const TYPE_COMMAND_MS = 28
const TYPE_OUTPUT_MS = 6
const TYPE_BOOT_COMMAND_MS = 30
const TYPE_BOOT_OUTPUT_MS = 7
const WHOAMI_AFTER_BOOT_MS = 2200
const SCROLL_AFTER_MS = 500

interface TerminalProps {
  powered: boolean
}

export function Terminal({ powered }: TerminalProps) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const outputRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const [active, setActive] = useState<TerminalCommand | null>(null)

  const type = useCallback(
    async (commandText: string, output: Segment[], commandSpeed: number, outputSpeed: number) => {
      const screen = outputRef.current
      if (!screen) return
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const speed = (ms: number) => (reduced ? 0 : ms)
      const prompt = { text: t('terminal.prompt'), className: 'is-prompt' }

      screen.replaceChildren()
      busyRef.current = true
      try {
        await typeSegments(screen, [prompt, { text: ' ' }], 0, controller.signal)
        await typeSegments(
          screen,
          [{ text: commandText, className: 'is-command' }],
          speed(commandSpeed),
          controller.signal,
        )
        const block = document.createElement('div')
        block.style.marginTop = '.3rem'
        screen.append(block)
        await typeSegments(block, output, speed(outputSpeed), controller.signal)
        await typeSegments(screen, [{ text: '\n' }, prompt, { text: ' ' }], 0, controller.signal)
        return true
      } catch {
        return false
      } finally {
        if (abortRef.current === controller) busyRef.current = false
      }
    },
    [t, reduced],
  )

  const run = useCallback(
    async (name: TerminalCommand) => {
      if (busyRef.current) return
      setActive(name)
      const finished = await type(
        typedCommand(name, t),
        commandOutput(name, t),
        TYPE_COMMAND_MS,
        TYPE_OUTPUT_MS,
      )
      const target = COMMAND_TARGETS[name]
      if (finished && target) {
        window.setTimeout(() => {
          document.getElementById(target)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
        }, SCROLL_AFTER_MS)
      }
    },
    [type, t, reduced],
  )

  const boot = useEffectEvent(async (onWhoami: (run: () => void) => void) => {
    const finished = await type(
      'npm run dev',
      bootOutput(t, BOOT_MS),
      TYPE_BOOT_COMMAND_MS,
      TYPE_BOOT_OUTPUT_MS,
    )
    if (finished) onWhoami(() => run('whoami'))
  })

  useEffect(() => {
    if (!powered) return
    let timer = 0
    boot((whoami) => {
      timer = window.setTimeout(whoami, WHOAMI_AFTER_BOOT_MS)
    })
    return () => clearTimeout(timer)
  }, [powered])

  useEffect(() => {
    const stop = () => {
      abortRef.current?.abort()
      busyRef.current = false
    }
    i18n.on('languageChanged', stop)
    return () => {
      i18n.off('languageChanged', stop)
      abortRef.current?.abort()
    }
  }, [i18n])

  return (
    <Chip refdes="U1" hero pins="all" led={false} className="terminal">
      <span className="terminal-badge">
        <i />
        {t('terminal.badge')}
      </span>
      <div className="terminal-header">
        <b />
        <b />
        <b />
        <em>{t('terminal.title')}</em>
      </div>
      <div ref={outputRef} className="terminal-output" aria-live="polite" />
      <div className="terminal-commands">
        {TERMINAL_COMMANDS.map((name) => (
          <button key={name} type="button" aria-pressed={active === name} onClick={() => run(name)}>
            {t(`terminal.commands.${name}`)}
          </button>
        ))}
      </div>
    </Chip>
  )
}
