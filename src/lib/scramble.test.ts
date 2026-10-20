import { describe, expect, it } from 'vitest'
import { scrambleFrame } from './scramble'

describe('scrambleFrame', () => {
  const pick = () => '#'

  it('shows only noise at the start, keeping spaces', () => {
    expect(scrambleFrame('Ver projetos', 0, pick)).toBe('### ########')
  })

  it('resolves characters left to right as progress grows', () => {
    expect(scrambleFrame('Ver projetos', 0.5, pick)).toBe('Ver pr######')
  })

  it('ends on the exact final text', () => {
    expect(scrambleFrame('Ver projetos', 1, pick)).toBe('Ver projetos')
  })
})
