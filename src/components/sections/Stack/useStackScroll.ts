import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../../hooks/useReducedMotion'

const smoothstep = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

const SEPARATE = 0.3
const BASE_PLATE = 320
const LAYER_GAP = 96
const FOCUS_LIFT = 26
const RISE = 320
const FOLLOW = 0.12

export function useStackScroll() {
  const sectionRef = useRef<HTMLElement>(null)
  const platesRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const sectionEl = sectionRef.current
    const platesEl = platesRef.current
    const listEl = listRef.current
    if (!sectionEl || !platesEl || !listEl) return
    const plateEls = [...platesEl.querySelectorAll<HTMLElement>('[data-level]')]
    const layerEls = [...listEl.querySelectorAll<HTMLElement>('[data-level]')]
    const reduced = prefersReducedMotion()
    let current = 0
    let target = 0
    let frame = 0
    let unit = platesEl.offsetWidth / BASE_PLATE

    const paint = () => {
      const separated = reduced ? 1 : smoothstep(Math.min(1, current / SEPARATE))
      const focus = 3 - Math.max(0, Math.min(3, ((current - SEPARATE) / 0.62) * 3.4))
      platesEl.style.setProperty('--a', `${(30 + current * 220).toFixed(1)}deg`)
      platesEl.style.transform = `rotateX(${58 - separated * 6}deg) rotateZ(${-42 + current * 14}deg) translateZ(${-separated * 60 * unit}px)`
      for (const plate of plateEls) {
        const level = Number(plate.dataset.level)
        const weight = current < SEPARATE ? 0 : Math.max(0, 1 - Math.abs(focus - level))
        const rise = current < SEPARATE ? 0 : smoothstep(clamp01(level - focus))
        plate.style.transform = `translateZ(${(level * separated * LAYER_GAP + weight * FOCUS_LIFT + rise * RISE) * unit}px)`
        plate.style.opacity = (1 - rise).toFixed(3)
        plate.style.visibility = rise > 0.995 ? 'hidden' : 'visible'
        plate.style.setProperty('--w', weight.toFixed(3))
        plate.classList.toggle('is-focused', weight > 0.5)
      }
      for (const layer of layerEls) {
        const level = Number(layer.dataset.level)
        const weight = current < SEPARATE ? 0.6 : Math.max(0, 1 - Math.abs(focus - level))
        layer.style.setProperty('--w', weight.toFixed(3))
      }
    }

    const tick = () => {
      current += (target - current) * FOLLOW
      paint()
      if (Math.abs(target - current) > 0.0005) {
        frame = requestAnimationFrame(tick)
      } else {
        current = target
        paint()
        frame = 0
      }
    }

    let start = 0
    let span = 1
    const measure = () => {
      unit = platesEl.offsetWidth / BASE_PLATE
      start = sectionEl.getBoundingClientRect().top + window.scrollY
      span = Math.max(1, sectionEl.offsetHeight - window.innerHeight)
      onScroll()
    }

    const onScroll = () => {
      target = clamp01((window.scrollY - start) / span)
      if (reduced) {
        current = target
        paint()
      } else if (!frame) {
        frame = requestAnimationFrame(tick)
      }
    }

    measure()
    paint()
    const layout = new ResizeObserver(measure)
    layout.observe(document.body)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      layout.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return { sectionRef, platesRef, listRef }
}
