import { describe, expect, it } from 'vitest'
import { languageFromPath, pathForLanguage } from './languagePath'

describe('languageFromPath', () => {
  it('reads Portuguese from the site root', () => {
    expect(languageFromPath('/', '/')).toBe('pt')
    expect(languageFromPath('/index.html', '/')).toBe('pt')
  })

  it('reads English from the en folder, with or without the trailing slash', () => {
    expect(languageFromPath('/en/', '/')).toBe('en')
    expect(languageFromPath('/en', '/')).toBe('en')
    expect(languageFromPath('/en/index.html', '/')).toBe('en')
  })

  it('does not mistake paths that only start with the letters en', () => {
    expect(languageFromPath('/english/', '/')).toBe('pt')
    expect(languageFromPath('/entrar', '/')).toBe('pt')
  })

  it('respects a base path', () => {
    expect(languageFromPath('/Portfolio/', '/Portfolio/')).toBe('pt')
    expect(languageFromPath('/Portfolio/en/', '/Portfolio/')).toBe('en')
  })
})

describe('pathForLanguage', () => {
  it('maps each language to its folder under the base', () => {
    expect(pathForLanguage('pt', '/')).toBe('/')
    expect(pathForLanguage('en', '/')).toBe('/en/')
    expect(pathForLanguage('en', '/Portfolio/')).toBe('/Portfolio/en/')
  })

  it('round-trips with languageFromPath', () => {
    for (const language of ['pt', 'en'] as const) {
      expect(languageFromPath(pathForLanguage(language, '/'), '/')).toBe(language)
    }
  })
})
