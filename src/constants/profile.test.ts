import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import privacyHtml from '../../public/privacidade.html?raw'
import { PROFILE } from './profile'

describe('contact e-mail', () => {
  it('is an address on the site domain', () => {
    expect(PROFILE.email).toMatch(/^[a-z0-9.]+@plovatto\.dev$/)
  })

  it('matches the address published in the structured data', () => {
    const [, graph] = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)!
    const person = JSON.parse(graph)['@graph'].find(
      (node: { '@type': string }) => node['@type'] === 'Person',
    )

    expect(person.email).toBe(`mailto:${PROFILE.email}`)
  })

  it('is offered for privacy requests in both languages', () => {
    const links = privacyHtml.match(new RegExp(`href="mailto:${PROFILE.email}"`, 'g'))

    expect(links).toHaveLength(2)
  })
})
