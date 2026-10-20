import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircuitBackground } from './components/CircuitBackground/CircuitBackground'
import { ActivityBar } from './components/layout/ActivityBar'
import { EditorTabs } from './components/layout/EditorTabs'
import { SiteFooter } from './components/layout/SiteFooter'
import { StatusBar } from './components/layout/StatusBar'
import type { OpeningStage } from './components/sections/Hero/CodeIntro'
import { Hero } from './components/sections/Hero/Hero'
import { BOOT_MS } from './components/sections/Hero/Terminal'
import { PROFILE } from './constants/profile'
import { useActiveSection } from './hooks/useActiveSection'
import './components/layout/layout.css'

interface PageProps {
  powered: boolean
  onStage: (stage: OpeningStage) => void
  onCompiled: () => void
}

const Page = memo(function Page({ powered, onStage, onCompiled }: PageProps) {
  return (
    <main id="main" tabIndex={-1}>
      <Hero powered={powered} onStage={onStage} onCompiled={onCompiled} />
      <SiteFooter />
    </main>
  )
})

function App() {
  const { t } = useTranslation()
  const active = useActiveSection()
  const [stage, setStage] = useState<OpeningStage>('idle')
  const [powered, setPowered] = useState(false)

  const build = {
    idle: t('statusBar.build'),
    writing: t('statusBar.writing', { file: t('nav.files.home') }),
    compiling: t('statusBar.compiling'),
    ready: t('statusBar.ready', { ms: BOOT_MS }),
  }[stage]

  const powerOn = useCallback(() => setPowered(true), [])

  return (
    <>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <CircuitBackground label={PROFILE.boardLabel} active={powered} />
      <ActivityBar active={active} />
      <EditorTabs active={active} messageSent={false} />
      <StatusBar active={active} build={build} />
      <Page powered={powered} onStage={setStage} onCompiled={powerOn} />
    </>
  )
}

export default App
