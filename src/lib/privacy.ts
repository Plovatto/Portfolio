import { currentLanguage } from '../i18n'

export function privacyUrl(): string {
  return `${import.meta.env.BASE_URL}privacidade.html${currentLanguage() === 'en' ? '#en' : ''}`
}
