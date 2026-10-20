import type { Theme } from '../../context/theme-context'

export const BOARD = {
  cell: 12,
  cellCoarse: 14,
  chunkHeight: 384,
  keepout: 2,
  pinSpacing: 3,
  pinInset: 2,
  density: 0.15,
  icArea: 520 * 520,
  traceWidth: 1.25,
  viaRadius: 2.6,
}

export const INNER = {
  cell: 26,
  density: 0.08,
  width: 2.6,
  scroll: 0.5,
  parallax: 12,
}

export const SPINE = {
  gap: 6,
  spacing: 2,
  chamfer: 3,
  width: 1.6,
  progress: 0.62,
  dash: [2, 22],
  flow: 0.042,
}

export const HUE = { from: 228, to: 292 }

export const PULSE = {
  trail: 14,
  speed: [65, 130] as const,
  life: [4300, 10000] as const,
  perArea: 42000,
  min: 8,
  max: 36,
  maxTotal: 72,
  hoverInterval: 150,
  hoverDistance: 28,
}

export const WAVE = {
  click: { maxD: 1300, speed: 820, trail: 220 },
  power: { maxD: 520, speed: 650, trail: 160 },
  hover: { maxD: 380, speed: 540, trail: 130, interval: 1700 },
  boot: { duration: 1600, delay: 200, trail: 200 },
  max: 14,
}

export const CARD = {
  haloPad: 56,
  haloBlur: 24,
  baseGlow: 0.22,
  hoverGlow: 0.75,
  cometSpeed: 490,
  cometLength: 120,
  maxComets: 16,
  outset: 1.5,
  portRadius: 2.2,
}

export const FLASHLIGHT = { radius: 230 }

export interface Palette {
  substrate: string
  trace: string
  via: string
  pad: string
  part: string
  silk: string
  inner: string
  innerVia: string
  signalSat: number
  signalLight: number
  additive: boolean
  glowAlpha: number
  flashlight: number
  halo: number
}

export const PALETTE: Record<Theme, Palette> = {
  dark: {
    substrate: '#07061a',
    trace: 'rgba(44, 62, 214, 0.34)',
    via: 'rgba(70, 86, 240, 0.52)',
    pad: 'rgba(150, 64, 255, 0.55)',
    part: 'rgba(136, 60, 250, 0.42)',
    silk: 'rgba(178, 110, 255, 0.55)',
    inner: 'rgba(34, 44, 180, 0.16)',
    innerVia: 'rgba(34, 44, 180, 0.22)',
    signalSat: 100,
    signalLight: 58,
    additive: true,
    glowAlpha: 1,
    flashlight: 0.9,
    halo: 1,
  },
  light: {
    substrate: '#f6f6fb',
    trace: 'rgba(52, 58, 150, 0.17)',
    via: 'rgba(52, 58, 170, 0.32)',
    pad: 'rgba(116, 50, 232, 0.36)',
    part: 'rgba(100, 56, 210, 0.24)',
    silk: 'rgba(100, 56, 210, 0.44)',
    inner: 'rgba(60, 66, 160, 0.06)',
    innerVia: 'rgba(60, 66, 160, 0.1)',
    signalSat: 92,
    signalLight: 50,
    additive: false,
    glowAlpha: 0.6,
    flashlight: 0.75,
    halo: 0.3,
  },
}

export const FRAME_BUDGET = {
  window: 90,
  slowFrame: 28,
  slowShare: 0.5,
  ignoreAbove: 250,
}

export const MOTION = {
  calm: 900,
  fast: 2600,
  min: 0.15,
  dimRate: 14,
  restoreRate: 4,
}
