import { useTranslation } from 'react-i18next'
import { LANGUAGES, currentLanguage } from '../../i18n'
import { switchLanguage } from '../../lib/languageTransition'

export function LanguageSwitch() {
  const { t } = useTranslation()
  const language = currentLanguage()

  return (
    <div className="language-switch-wrap">
      <div
        className="language-switch"
        role="group"
        aria-label={t('nav.language')}
        data-language={language}
      >
        <span className="language-thumb" aria-hidden="true" />
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            lang={code === 'pt' ? 'pt-BR' : 'en'}
            aria-pressed={language === code}
            onClick={() => {
              if (code !== language) switchLanguage(code)
            }}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
