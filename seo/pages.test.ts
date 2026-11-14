/// <reference lib="dom" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { languageRedirectScript, renderPage, structuredData } from './pages.ts'
import type { PageLanguage, Translation } from './pages.ts'

const template = readFileSync('index.html', 'utf8')
const translation = (language: PageLanguage): Translation =>
  JSON.parse(readFileSync(`src/locales/${language}/translation.json`, 'utf8'))

function parse(language: PageLanguage) {
  const html = renderPage(template, language, translation(language))
  return { html, doc: new DOMParser().parseFromString(html, 'text/html') }
}

const content = (doc: Document, selector: string) =>
  doc.querySelector(selector)?.getAttribute('content') ??
  doc.querySelector(selector)?.getAttribute('href')

describe('renderPage', () => {
  it('renders the Portuguese page at the site root', () => {
    const { doc } = parse('pt')
    const t = translation('pt')
    expect(doc.documentElement.lang).toBe('pt-BR')
    expect(doc.title).toBe(t.meta.title)
    expect(content(doc, 'meta[name="description"]')).toBe(t.meta.description)
    expect(content(doc, 'link[rel="canonical"]')).toBe('https://plovatto.dev/')
    expect(content(doc, 'meta[property="og:url"]')).toBe('https://plovatto.dev/')
    expect(content(doc, 'meta[property="og:locale"]')).toBe('pt_BR')
  })

  it('renders the English page under /en/', () => {
    const { doc } = parse('en')
    const t = translation('en')
    expect(doc.documentElement.lang).toBe('en')
    expect(doc.title).toBe(t.meta.title)
    expect(content(doc, 'meta[name="description"]')).toBe(t.meta.description)
    expect(content(doc, 'link[rel="canonical"]')).toBe('https://plovatto.dev/en/')
    expect(content(doc, 'meta[property="og:locale"]')).toBe('en_US')
    expect(content(doc, 'meta[property="og:locale:alternate"]')).toBe('pt_BR')
  })

  it('links both languages to each other with hreflang on every page', () => {
    for (const language of ['pt', 'en'] as const) {
      const { doc } = parse(language)
      const alternates = Object.fromEntries(
        [...doc.querySelectorAll('link[rel="alternate"]')].map((link) => [
          link.getAttribute('hreflang'),
          link.getAttribute('href'),
        ]),
      )
      expect(alternates).toEqual({
        'pt-BR': 'https://plovatto.dev/',
        en: 'https://plovatto.dev/en/',
        'x-default': 'https://plovatto.dev/',
      })
    }
  })

  it('keeps exactly one title, description and canonical', () => {
    const { doc } = parse('pt')
    expect(doc.querySelectorAll('title')).toHaveLength(1)
    expect(doc.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })

  it('puts real content in noscript instead of a JavaScript warning', () => {
    const { html } = parse('pt')
    const noscript = html.slice(html.indexOf('<noscript>'), html.indexOf('</noscript>'))
    expect(noscript).toContain('<h1>Pandora Becker Lovatto</h1>')
    expect(noscript).toContain(translation('pt').hero.lede)
    expect(noscript).toContain('https://sparkchat.plovatto.dev/')
    expect(noscript).not.toContain('JavaScript')
  })

  it('emits valid JSON-LD that matches structuredData', () => {
    const { doc } = parse('en')
    const script = doc.querySelector('script[type="application/ld+json"]')
    expect(JSON.parse(script!.textContent!)).toEqual(structuredData('en', translation('en')))
  })

  it('escapes markup coming from the translations', () => {
    const t = translation('pt')
    const hostile = { ...t, meta: { ...t.meta, title: 'A "B" <script>alert(1)</script>' } }
    const html = renderPage(template, 'pt', hostile)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('A &quot;B&quot; &lt;script&gt;')
  })

  it('fails loudly when the template lost a marker', () => {
    expect(() =>
      renderPage('<html lang="pt-BR"><head></head></html>', 'pt', translation('pt')),
    ).toThrow(/seo:head/)
  })
})

describe('languageRedirectScript', () => {
  const CHROME =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'

  function visit(
    pathname: string,
    {
      languages = ['en-US'],
      userAgent = CHROME,
      stored = null as string | null,
      base = '/',
      search = '',
      hash = '',
    } = {},
  ) {
    let target: string | null = null
    const run = new Function('navigator', 'localStorage', 'location', languageRedirectScript(base))
    run(
      { userAgent, languages, language: languages[0] },
      { getItem: () => stored },
      { pathname, search, hash, replace: (url: string) => (target = url) },
    )
    return target
  }

  it('sends English systems from the root to /en/', () => {
    expect(visit('/', { languages: ['en-US', 'en'] })).toBe('/en/')
  })

  it('sends Portuguese systems from /en/ to the root', () => {
    expect(visit('/en/', { languages: ['pt-BR', 'pt'] })).toBe('/')
  })

  it('stays put when the page already matches the system language', () => {
    expect(visit('/', { languages: ['pt-BR'] })).toBeNull()
    expect(visit('/en/', { languages: ['en-GB'] })).toBeNull()
  })

  it('uses the first supported language and falls back to English', () => {
    expect(visit('/en/', { languages: ['es-ES', 'pt-PT', 'en'] })).toBe('/')
    expect(visit('/', { languages: ['de-DE', 'fr'] })).toBe('/en/')
  })

  it('respects a language the visitor picked on the switch', () => {
    expect(visit('/', { languages: ['en-US'], stored: 'pt' })).toBeNull()
    expect(visit('/', { languages: ['pt-BR'], stored: 'en' })).toBe('/en/')
  })

  it('never redirects search engines or link previews', () => {
    for (const userAgent of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Google-InspectionTool/1.0;)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0)',
      'WhatsApp/2.23.20.0',
      'Mozilla/5.0 (Linux; Android 11) Chrome-Lighthouse',
    ]) {
      expect(visit('/', { languages: ['en-US'], userAgent })).toBeNull()
    }
  })

  it('keeps the query string and hash, and respects a base path', () => {
    expect(visit('/', { search: '?utm=cv', hash: '#projetos' })).toBe('/en/?utm=cv#projetos')
    expect(visit('/Portfolio/', { base: '/Portfolio/' })).toBe('/Portfolio/en/')
  })

  it('runs first in the head of both pages', () => {
    for (const language of ['pt', 'en'] as const) {
      const { doc } = parse(language)
      const first = doc.querySelector('meta[name="author"] ~ script')
      expect(first?.textContent).toContain('location.replace')
    }
  })
})

describe('structuredData', () => {
  it('describes a profile page whose main entity is the person', () => {
    const graph = structuredData('pt', translation('pt'))['@graph']
    const [profile, person, website] = graph
    expect(profile['@type']).toBe('ProfilePage')
    expect(profile.mainEntity).toEqual({ '@id': person['@id'] })
    expect(profile.isPartOf).toEqual({ '@id': website['@id'] })
    expect(person).toMatchObject({
      '@type': 'Person',
      name: 'Pandora Becker Lovatto',
      jobTitle: translation('pt').hero.role,
      email: 'mailto:pandora@plovatto.dev',
      sameAs: ['https://github.com/Plovatto', expect.stringContaining('linkedin.com/in/')],
    })
  })

  it('keeps the same person and website ids in both languages', () => {
    const ids = (language: PageLanguage) =>
      structuredData(language, translation(language))
        ['@graph'].slice(1)
        .map((node) => node['@id'])
    expect(ids('pt')).toEqual(ids('en'))
  })
})
