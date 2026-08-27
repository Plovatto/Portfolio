import type { CircuitGrid, CircuitPath } from './circuitGenerator'
import { generateSectorPath } from './circuitGenerator'
import { LIFECYCLE, PULSE } from './config'
import type { LiveCircuit, Pulse } from './types'
import { randomIn, smoothstep } from './utils'

function pickActiveDuration(): number {
  return Math.random() < LIFECYCLE.activeChance
    ? randomIn(LIFECYCLE.activeRange)
    : randomIn(LIFECYCLE.activeLongRange)
}

export function createPulse(path: CircuitPath): Pulse {
  return {
    distance: Math.random() * path.totalLength,
    speed: randomIn(PULSE.speedRange),
    colorWaveLength: randomIn(PULSE.colorWaveLengthRange),
    colorPhase: Math.random(),
  }
}

export function createCircuit(grid: CircuitGrid, sectorX: number, sectorY: number): LiveCircuit {
  const path = generateSectorPath(grid, sectorX, sectorY)
  return {
    sectorX,
    sectorY,
    path,
    pulse: createPulse(path),
    age: 0,
    fadeInDuration: randomIn(LIFECYCLE.fadeInRange),
    activeDuration: pickActiveDuration(),
    fadeOutDuration: randomIn(LIFECYCLE.fadeOutRange),
    influence: 0,
  }
}

export function getCycleDuration(circuit: LiveCircuit): number {
  return circuit.fadeInDuration + circuit.activeDuration + circuit.fadeOutDuration
}

export function getOpacity(circuit: LiveCircuit): number {
  const { age, fadeInDuration, activeDuration, fadeOutDuration } = circuit
  if (age < fadeInDuration) return smoothstep(age / fadeInDuration)
  if (age < fadeInDuration + activeDuration) return 1
  const fadeOutAge = age - fadeInDuration - activeDuration
  return 1 - smoothstep(fadeOutAge / fadeOutDuration)
}
