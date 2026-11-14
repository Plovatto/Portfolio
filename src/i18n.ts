import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { languageFromPath, pathForLanguage } from './lib/languagePath'
import en from './locales/en/translation.json'
import pt from './locales/pt/translation.json'

export const LANGUAGES = ['pt', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

const HTML_LANG: Record<Language, string> = { pt: 'pt-BR', en: 'en' }
const BASE = import.meta.env.BASE_URL

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'en' ? 'en' : 'pt'
}

i18n.use(initReactI18next).init({
  resources: { pt: { translation: pt }, en: { translation: en } },
  lng: languageFromPath(location.pathname, BASE),
  supportedLngs: LANGUAGES,
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
})

function syncDocument() {
  const language = currentLanguage()
  document.documentElement.lang = HTML_LANG[language]
  document.title = i18n.t(document.hidden ? 'meta.away' : 'meta.title')
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description'))
}

function syncUrl() {
  const language = currentLanguage()
  if (languageFromPath(location.pathname, BASE) === language) return
  const url = `${pathForLanguage(language, BASE)}${location.search}${location.hash}`
  history.replaceState(history.state, '', url)
}

syncDocument()
i18n.on('languageChanged', () => {
  syncDocument()
  syncUrl()
})
document.addEventListener('visibilitychange', syncDocument)

export default i18n
