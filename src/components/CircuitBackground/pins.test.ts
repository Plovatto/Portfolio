import { describe, expect, it } from 'vitest'
import { boardOffset, toBoardScroll } from './pins'
import type { PinRange } from './pins'

function pin(start: number, span: number, el = document.createElement('section')): PinRange {
  return { el, start, span }
}

describe('toBoardScroll', () => {
  const pins = [pin(1000, 500)]

  it('follows the page before the pinned section', () => {
    expect(toBoardScroll(400, pins)).toBe(400)
  })

  it('stands still while the section is pinned', () => {
    expect(toBoardScroll(1000, pins)).toBe(1000)
    expect(toBoardScroll(1300, pins)).toBe(1000)
    expect(toBoardScroll(1500, pins)).toBe(1000)
  })

  it('resumes after the pin, shifted by its span', () => {
    expect(toBoardScroll(1800, pins)).toBe(1300)
  })

  it('adds up several pins', () => {
    expect(toBoardScroll(5000, [pin(1000, 500), pin(3000, 200)])).toBe(4300)
  })
})

describe('boardOffset', () => {
  const before = document.createElement('p')
  const section = document.createElement('section')
  const inside = document.createElement('div')
  const after = document.createElement('p')
  section.append(inside)
  document.body.append(before, section, after)
  const pins = [pin(1000, 500, section)]

  it('never shifts content that comes before the pinned section', () => {
    expect(boardOffset(before, 400, pins)).toBe(400)
    expect(boardOffset(before, 1300, pins)).toBe(1300)
    expect(boardOffset(before, 1800, pins)).toBe(1800)
  })

  it('shifts content inside the pinned section by the scroll spent pinned', () => {
    expect(boardOffset(inside, 400, pins)).toBe(400)
    expect(boardOffset(inside, 1300, pins)).toBe(1000)
    expect(boardOffset(inside, 1800, pins)).toBe(1300)
  })

  it('shifts content after the pinned section by the whole span', () => {
    expect(boardOffset(after, 400, pins)).toBe(-100)
    expect(boardOffset(after, 1800, pins)).toBe(1300)
  })

  it('gives the same board position wherever the page is scrolled', () => {
    const docTop = 2600
    const boardTop = (scrollY: number) => docTop - scrollY + boardOffset(after, scrollY, pins)
    expect(boardTop(0)).toBe(2100)
    expect(boardTop(1300)).toBe(2100)
    expect(boardTop(3000)).toBe(2100)
  })
})
