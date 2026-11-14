import { describe, expect, it } from 'vitest'
import privacyHtml from '../../public/privacidade.html?raw'
import { PROFILE } from './profile'

describe('contact e-mail', () => {
  it('is an address on the site domain', () => {
    expect(PROFILE.email).toMatch(/^[a-z0-9.]+@plovatto\.dev$/)
  })

  it('is offered for privacy requests in both languages', () => {
    const links = privacyHtml.match(new RegExp(`href="mailto:${PROFILE.email}"`, 'g'))

    expect(links).toHaveLength(2)
  })
})
