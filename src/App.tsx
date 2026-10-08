import { useTranslation } from 'react-i18next'
import { CircuitBackground } from './components/CircuitBackground/CircuitBackground'
import { ActivityBar } from './components/layout/ActivityBar'
import { EditorTabs } from './components/layout/EditorTabs'
import { SiteFooter } from './components/layout/SiteFooter'
import { StatusBar } from './components/layout/StatusBar'
import { useActiveSection } from './hooks/useActiveSection'
import './components/layout/layout.css'

function App() {
  const { t } = useTranslation()
  const active = useActiveSection()

  return (
    <>
      <CircuitBackground />
      <ActivityBar active={active} />
      <EditorTabs active={active} messageSent={false} />
      <StatusBar active={active} build={t('statusBar.build')} />
      <main id="main" tabIndex={-1}>
        <SiteFooter />
      </main>
    </>
  )
}

export default App
