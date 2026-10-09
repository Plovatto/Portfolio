let release: (() => void) | null = null

const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

export function lockIntroScroll() {
  if (release) return
  history.scrollRestoration = 'manual'
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search)
  toTop()

  const root = document.documentElement
  root.classList.add('intro-lock')
  const block = (e: Event) => e.preventDefault()
  const blockAnchor = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('a[href^="#"]')) e.preventDefault()
  }
  const keepTop = () => {
    if (window.scrollY !== 0) toTop()
  }
  const options = { passive: false, capture: true }
  window.addEventListener('wheel', block, options)
  window.addEventListener('touchmove', block, options)
  window.addEventListener('click', blockAnchor, true)
  window.addEventListener('scroll', keepTop, { passive: true })

  release = () => {
    root.classList.remove('intro-lock')
    window.removeEventListener('wheel', block, options)
    window.removeEventListener('touchmove', block, options)
    window.removeEventListener('click', blockAnchor, true)
    window.removeEventListener('scroll', keepTop)
  }
}

export function unlockIntroScroll() {
  release?.()
  release = null
}
