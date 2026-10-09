import { describe, expect, it } from 'vitest'
import { progress } from './tween'

describe('progress', () => {
  it('runs from 0 to 1 over the duration', () => {
    expect(progress(100, 100, 400)).toBe(0)
    expect(progress(300, 100, 400)).toBe(0.5)
    expect(progress(500, 100, 400)).toBe(1)
  })

  it('never goes below 0 when the frame time is earlier than the start', () => {
    expect(progress(99, 100, 1)).toBe(0)
  })

  it('never passes 1 and finishes at once without a duration', () => {
    expect(progress(10_000, 100, 400)).toBe(1)
    expect(progress(100, 100, 0)).toBe(1)
  })
})
