export interface RoundRect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

export function perimeter({ w, h, r }: RoundRect): number {
  return 2 * (w + h) - 8 * r + 2 * Math.PI * r
}

export function pointAt(rr: RoundRect, d: number): { x: number; y: number } {
  const { x, y, w, h, r } = rr
  const a = w - 2 * r
  const b = h - 2 * r
  const q = (Math.PI * r) / 2
  const total = perimeter(rr)
  let t = ((d % total) + total) % total

  const arc = (cx: number, cy: number, from: number) => {
    const angle = from + (t / q) * (Math.PI / 2)
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
  }

  if (t < a) return { x: x + r + t, y }
  t -= a
  if (t < q) return arc(x + w - r, y + r, -Math.PI / 2)
  t -= q
  if (t < b) return { x: x + w, y: y + r + t }
  t -= b
  if (t < q) return arc(x + w - r, y + h - r, 0)
  t -= q
  if (t < a) return { x: x + w - r - t, y: y + h }
  t -= a
  if (t < q) return arc(x + r, y + h - r, Math.PI / 2)
  t -= q
  if (t < b) return { x, y: y + h - r - t }
  t -= b
  return arc(x + r, y + r, Math.PI)
}

export function distanceAt(rr: RoundRect, px: number, py: number): number {
  const { x, y, w, h, r } = rr
  const a = w - 2 * r
  const b = h - 2 * r
  const q = (Math.PI * r) / 2
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v))
  const toTop = Math.abs(py - y)
  const toRight = Math.abs(px - (x + w))
  const toBottom = Math.abs(py - (y + h))
  const toLeft = Math.abs(px - x)
  const min = Math.min(toTop, toRight, toBottom, toLeft)

  if (min === toTop) return clamp(px - (x + r), a)
  if (min === toRight) return a + q + clamp(py - (y + r), b)
  if (min === toBottom) return a + q + b + q + clamp(x + w - r - px, a)
  return 2 * a + b + 3 * q + clamp(y + h - r - py, b)
}
