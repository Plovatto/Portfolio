import type { Theme } from '../../context/theme-context'
import type { ThemeColorConfig } from './types'

export const SECTOR_SIZE = 110

const GRID_COLOR: Record<Theme, string> = {
  light: 'rgba(148, 163, 184, 0.12)',
  dark: 'rgba(203, 213, 225, 0.08)',
}

export const GRID = {
  spacing: 64,
  lineWidth: 0.5,
  color: GRID_COLOR,
}

export const PULSE = {
  trailLength: 240,
  speedRange: [35, 80] as [number, number],
  colorWaveLengthRange: [320, 760] as [number, number],
}

export const LIFECYCLE = {
  fadeInRange: [1500, 2800] as [number, number],
  activeRange: [14000, 24000] as [number, number],
  activeLongRange: [32000, 60000] as [number, number],
  activeChance: 0.85,
  fadeOutRange: [2400, 4000] as [number, number],
}

export const ALPHA = {
  trail: 0.5,
  glow: 0.78,
  head: 0.92,
}

export const OVERLOAD = {
  radius: 340,
  speedBoost: 0.45,
  alphaBoost: 1.3,
  revealAlpha: 0.5,
  hoverRevealStrength: 0.85,
  lineThicken: 0.22,
  maxInfluence: 10,
  smoothRate: 4.2,
}

export const HOVER_GLOW = {
  hue: 213,
  maxRadius: 190,
  minRadius: 32,
  alpha: 0.16,
  smoothRate: 3.2,
}

export const CLICK = {
  speedBoost: 4.5,
  burstDuration: 1800,
  surgeMultiplier: 1.8,
  ringCount: 3,
  ringStagger: 130,
  ringMaxRadius: 320,
  maxDots: 120,
  dotDuration: 950,
}

export const PING = {
  duration: 550,
  max: 140,
}

export const PARALLAX = {
  maxShift: 7,
  smoothRate: 3,
}

export const THEME_COLORS: Record<Theme, ThemeColorConfig> = {
  light: { hueFrom: 228, hueTo: 274, saturation: 88, lightness: 48 },
  dark: { hueFrom: 226, hueTo: 280, saturation: 100, lightness: 27 },
}
