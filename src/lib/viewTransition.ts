import { flushSync } from 'react-dom'
import { prefersReducedMotion } from '../hooks/useReducedMotion'

export function circularTransition(origin: HTMLElement, update: () => void) {
  if (!document.startViewTransition || prefersReducedMotion()) {
    update()
    return
  }
  const rect = origin.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  const transition = document.startViewTransition(() => flushSync(update))
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: 700,
        easing: 'cubic-bezier(.19,1,.22,1)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
}
