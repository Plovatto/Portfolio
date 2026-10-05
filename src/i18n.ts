import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'
import pt from './locales/pt/translation.json'

export const LANGUAGES = ['pt', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

const HTML_LANG: Record<Language, string> = { pt: 'pt-BR', en: 'en' }

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'pt' ? 'pt' : 'en'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { pt: { translation: pt }, en: { translation: en } },
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'portfolio-language',
      caches: ['localStorage'],
    },
  })

function syncDocument() {
  const language = currentLanguage()
  document.documentElement.lang = HTML_LANG[language]
  document.title = i18n.t('meta.title')
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18n.t('meta.description'))
}

syncDocument()
i18n.on('languageChanged', syncDocument)

export default i18n
