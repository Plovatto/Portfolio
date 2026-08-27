import type { CircuitPath } from './circuitGenerator'

export interface Pulse {
  distance: number
  speed: number
  colorWaveLength: number
  colorPhase: number
}

export interface LiveCircuit {
  sectorX: number
  sectorY: number
  path: CircuitPath
  pulse: Pulse
  age: number
  fadeInDuration: number
  activeDuration: number
  fadeOutDuration: number
  influence: number
}

export interface Ping {
  x: number
  y: number
  start: number
  colorT: number
}

export interface ClickDot {
  x: number
  y: number
  start: number
  hue: number
  sat: number
  light: number
  startRadius: number
  maxRadius: number
  baseOpacity: number
}

export interface ClickBurst {
  x: number
  y: number
  start: number
}

export interface ThemeColorConfig {
  hueFrom: number
  hueTo: number
  saturation: number
  lightness: number
}

export interface HslColor {
  hue: number
  sat: number
  light: number
}
