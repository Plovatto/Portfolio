import { useEffect, useRef } from 'react'

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const enter = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('in', 'seen')
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    const leave = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) el.classList.remove('in')
    })
    enter.observe(el)
    leave.observe(el)
    return () => {
      enter.disconnect()
      leave.disconnect()
    }
  }, [])

  return ref
}
