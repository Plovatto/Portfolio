type Easing = (k: number) => number

const easeOutCubic: Easing = (k) => 1 - Math.pow(1 - k, 3)
export const easeOutQuad: Easing = (k) => 1 - Math.pow(1 - k, 2)
export const linear: Easing = (k) => k

export function progress(now: number, start: number, duration: number) {
  return duration > 0 ? Math.min(1, Math.max(0, (now - start) / duration)) : 1
}

export function tween(
  duration: number,
  step: (eased: number, progress: number) => void,
  easing: Easing = easeOutCubic,
): Promise<void> {
  const start = performance.now()
  return new Promise((resolve) => {
    const frame = (now: number) => {
      const k = progress(now, start, duration)
      step(easing(k), k)
      if (k < 1) requestAnimationFrame(frame)
      else resolve()
    }
    requestAnimationFrame(frame)
  })
}
