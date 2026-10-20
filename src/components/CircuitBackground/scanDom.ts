import { pinShift, toBoardScroll } from './pins'
import type { PinRange } from './pins'
import type { ChipSpec, PinLayout, Rect } from './types'

const PIN_LAYOUTS: PinLayout[] = ['lr', 'tb', 'all', 'none']

function documentRect(el: Element, pins: PinRange[]): Rect {
  const r = el.getBoundingClientRect()
  const y = toBoardScroll(window.scrollY, pins) - pinShift(el, pins)
  return {
    left: r.left + window.scrollX,
    top: r.top + y,
    right: r.right + window.scrollX,
    bottom: r.bottom + y,
  }
}

const hasArea = (r: Rect) => r.right - r.left > 0 && r.bottom - r.top > 0

export function scanDom(pins: PinRange[]): { chips: ChipSpec[]; quiets: Rect[] } {
  const chips: ChipSpec[] = []
  for (const el of document.querySelectorAll<HTMLElement>('[data-chip]')) {
    const rect = documentRect(el, pins)
    if (!hasArea(rect)) continue
    const layout = el.dataset.pins as PinLayout | undefined
    chips.push({
      ...rect,
      el,
      ref: el.dataset.chip || 'U',
      pins: layout && PIN_LAYOUTS.includes(layout) ? layout : 'lr',
      hero: el.hasAttribute('data-chip-hero'),
      bare: el.hasAttribute('data-bare'),
      radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
    })
  }

  const quiets = [...document.querySelectorAll('[data-quiet]')]
    .map((el) => documentRect(el, pins))
    .filter(hasArea)
  return { chips, quiets }
}
