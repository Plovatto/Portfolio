import type { CircuitPath, Point } from './circuitGenerator'
import type { HslColor, Pulse, ThemeColorConfig } from './types'

export function randomIn([min, max]: [number, number]): number {
  return min + Math.random() * (max - min)
}

export function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

export function distanceToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(px - a.x, py - a.y)

  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSq))
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

export function nearestDistanceToPath(path: CircuitPath, x: number, y: number): number {
  let min = Infinity
  for (let i = 1; i < path.points.length; i++) {
    const d = distanceToSegment(x, y, path.points[i - 1], path.points[i])
    if (d < min) min = d
  }
  return min
}

export function proximityInfluence(dist: number, radius: number): number {
  return Math.exp(-3 * (dist / radius))
}

export function colorHsl(colors: ThemeColorConfig, t: number, boost = 0): HslColor {
  return {
    hue: colors.hueFrom + (colors.hueTo - colors.hueFrom) * t,
    sat: Math.min(100, colors.saturation + boost * 10),
    light: Math.min(80, colors.lightness + boost * 16),
  }
}

export function hsla({ hue, sat, light }: HslColor, alpha: number): string {
  return `hsla(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, ${alpha})`
}

export function colorMixAt(pulse: Pulse, distance: number): number {
  const cycles = distance / pulse.colorWaveLength + pulse.colorPhase
  return (Math.sin(cycles * Math.PI * 2) + 1) / 2
}
