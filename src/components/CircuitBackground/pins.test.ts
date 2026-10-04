import { describe, expect, it } from 'vitest'
import { pinShift, toBoardScroll } from './pins'
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

describe('pinShift', () => {
  it('only shifts content that comes after the pinned section', () => {
    const before = document.createElement('p')
    const section = document.createElement('section')
    const inside = document.createElement('div')
    const after = document.createElement('p')
    section.append(inside)
    document.body.append(before, section, after)
    const pins = [pin(1000, 500, section)]

    expect(pinShift(before, pins)).toBe(0)
    expect(pinShift(inside, pins)).toBe(0)
    expect(pinShift(after, pins)).toBe(500)
  })
})
