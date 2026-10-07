import { CircuitBackground } from './components/CircuitBackground/CircuitBackground'
import { ActivityBar } from './components/layout/ActivityBar'
import { useActiveSection } from './hooks/useActiveSection'
import './components/layout/layout.css'

function App() {
  const active = useActiveSection()

  return (
    <>
      <CircuitBackground />
      <ActivityBar active={active} />
      <main id="main" tabIndex={-1} />
    </>
  )
}

export default App
