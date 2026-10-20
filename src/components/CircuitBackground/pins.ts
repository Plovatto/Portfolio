export interface PinRange {
  el: HTMLElement
  start: number
  span: number
}

export function measurePins(): PinRange[] {
  const pins: PinRange[] = []
  for (const el of document.querySelectorAll<HTMLElement>('[data-board-pin]')) {
    const sticky = el.firstElementChild as HTMLElement | null
    if (!sticky) continue
    const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0
    pins.push({
      el,
      start: el.getBoundingClientRect().top + window.scrollY - stickyTop,
      span: Math.max(0, el.offsetHeight - sticky.offsetHeight),
    })
  }
  return pins
}

export function toBoardScroll(scrollY: number, pins: PinRange[]): number {
  let consumed = 0
  for (const pin of pins) consumed += Math.min(Math.max(scrollY - pin.start, 0), pin.span)
  return scrollY - consumed
}

export function boardOffset(el: Element, scrollY: number, pins: PinRange[]): number {
  let offset = scrollY
  for (const pin of pins) {
    if (pin.el.contains(el)) {
      offset -= Math.min(Math.max(scrollY - pin.start, 0), pin.span)
    } else if (pin.el.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
      offset -= pin.span
    }
  }
  return offset
}
