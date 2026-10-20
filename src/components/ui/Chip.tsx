import type { PointerEvent, ReactNode, Ref } from 'react'
import type { PinLayout } from '../CircuitBackground/types'

interface ChipProps {
  refdes: string
  pins?: PinLayout
  hero?: boolean
  led?: boolean
  as?: 'div' | 'article' | 'aside'
  className?: string
  ref?: Ref<HTMLElement>
  children: ReactNode
}

function trackPointer(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'mouse') return
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--my', `${e.clientY - rect.top}px`)
}

export function Chip({
  refdes,
  pins = 'lr',
  hero,
  led = true,
  as: Tag = 'div',
  className = '',
  ref,
  children,
}: ChipProps) {
  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      data-chip={refdes}
      data-pins={pins}
      data-chip-hero={hero ? '' : undefined}
      className={`chip ${className}`}
      onPointerMove={trackPointer}
    >
      {led ? <span className="chip-led" aria-hidden="true" /> : null}
      {children}
    </Tag>
  )
}
