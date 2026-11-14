import type { Language } from '../i18n'

const PREFIX: Record<Language, string> = { pt: '', en: 'en/' }

export function languageFromPath(pathname: string, base: string): Language {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '')
  return rest === 'en' || rest.startsWith('en/') ? 'en' : 'pt'
}

export function pathForLanguage(language: Language, base: string): string {
  return `${base}${PREFIX[language]}`
}
