import type { Theme } from '../../context/theme-context'
import type { CircuitGrid } from './circuitGenerator'
import { computeCircuitGrid, pointAtDistance, subPath } from './circuitGenerator'
import {
  ALPHA,
  CLICK,
  GRID,
  HOVER_GLOW,
  OVERLOAD,
  PARALLAX,
  PING,
  PULSE,
  SECTOR_SIZE,
  THEME_COLORS,
} from './config'
import { createCircuit, getCycleDuration, getOpacity } from './circuitLifecycle'
import type { ClickBurst, ClickDot, LiveCircuit, Ping, ThemeColorConfig } from './types'
import {
  colorHsl,
  colorMixAt,
  hsla,
  nearestDistanceToPath,
  proximityInfluence,
  smoothstep,
} from './utils'

export class CircuitEngine {
  private readonly ctx: CanvasRenderingContext2D
  private readonly prefersReducedMotion: boolean

  private grid: CircuitGrid | null = null
  private circuits: LiveCircuit[] = []
  private width = 0
  private height = 0
  private animationFrame = 0
  private lastTime = 0
  private resizeTimeout: number | undefined

  private pointerX: number | null = null
  private pointerY: number | null = null
  private clickBursts: ClickBurst[] = []
  private pings: Ping[] = []
  private clickDots: ClickDot[] = []
  private parallaxX = 0
  private parallaxY = 0
  private hoverGlowStrength = 0

  private readonly canvas: HTMLCanvasElement
  private readonly getTheme: () => Theme

  constructor(canvas: HTMLCanvasElement, getTheme: () => Theme) {
    this.canvas = canvas
    this.getTheme = getTheme
    this.ctx = canvas.getContext('2d')!
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  start() {
    this.setup()
    this.animationFrame = requestAnimationFrame(this.render)
    window.addEventListener('resize', this.handleResize)
    document.addEventListener('visibilitychange', this.handleVisibility)
    window.addEventListener('pointermove', this.handlePointerMove)
    window.addEventListener('pointerleave', this.handlePointerLeave)
    window.addEventListener('blur', this.handlePointerLeave)
    window.addEventListener('click', this.handleClick)
  }

  stop() {
    cancelAnimationFrame(this.animationFrame)
    window.clearTimeout(this.resizeTimeout)
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerleave', this.handlePointerLeave)
    window.removeEventListener('blur', this.handlePointerLeave)
    window.removeEventListener('click', this.handleClick)
  }

  private setup = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const nextGrid = computeCircuitGrid({
      width: this.width,
      height: this.height,
      sectorSize: SECTOR_SIZE,
    })
    this.grid = nextGrid
    this.circuits = []

    for (let sy = 0; sy < nextGrid.sectorRows; sy++) {
      for (let sx = 0; sx < nextGrid.sectorCols; sx++) {
        const circuit = createCircuit(nextGrid, sx, sy)
        circuit.age = Math.random() * getCycleDuration(circuit)
        this.circuits.push(circuit)
      }
    }
  }

  private drawGrid() {
    const ctx = this.ctx
    ctx.strokeStyle = GRID.color[this.getTheme()]
    ctx.lineWidth = GRID.lineWidth
    ctx.beginPath()
    for (let x = 0; x <= this.width; x += GRID.spacing) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
    }
    for (let y = 0; y <= this.height; y += GRID.spacing) {
      ctx.moveTo(0, y)
      ctx.lineTo(this.width, y)
    }
    ctx.stroke()
  }

  private drawHoverGlow(x: number, y: number, strength: number) {
    if (strength <= 0.01) return
    const ctx = this.ctx
    const radius = HOVER_GLOW.minRadius + strength * (HOVER_GLOW.maxRadius - HOVER_GLOW.minRadius)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `hsla(${HOVER_GLOW.hue}, 85%, 60%, ${HOVER_GLOW.alpha * strength})`)
    gradient.addColorStop(
      0.55,
      `hsla(${HOVER_GLOW.hue}, 85%, 55%, ${HOVER_GLOW.alpha * 0.4 * strength})`,
    )
    gradient.addColorStop(1, `hsla(${HOVER_GLOW.hue}, 85%, 55%, 0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  private spawnClickDots(x: number, y: number, colors: ThemeColorConfig, time: number) {
    for (let i = 0; i < CLICK.ringCount && this.clickDots.length < CLICK.maxDots; i++) {
      const parts = colorHsl(colors, Math.random(), 0.25)
      this.clickDots.push({
        x,
        y,
        start: time + i * CLICK.ringStagger,
        hue: parts.hue,
        sat: parts.sat,
        light: parts.light,
        startRadius: 3,
        maxRadius: CLICK.ringMaxRadius,
        baseOpacity: 0.5,
      })
    }
  }

  private updateParallax(delta: number) {
    let targetX = 0
    let targetY = 0
    if (
      !this.prefersReducedMotion &&
      this.pointerX !== null &&
      this.pointerY !== null &&
      this.width &&
      this.height
    ) {
      targetX = ((this.pointerX - this.width / 2) / (this.width / 2)) * PARALLAX.maxShift
      targetY = ((this.pointerY - this.height / 2) / (this.height / 2)) * PARALLAX.maxShift
    }
    const ease = 1 - Math.exp(-PARALLAX.smoothRate * delta)
    this.parallaxX += (targetX - this.parallaxX) * ease
    this.parallaxY += (targetY - this.parallaxY) * ease
  }

  private updateHoverGlow(delta: number) {
    const target =
      !this.prefersReducedMotion && this.pointerX !== null && this.pointerY !== null ? 1 : 0
    this.hoverGlowStrength +=
      (target - this.hoverGlowStrength) * (1 - Math.exp(-HOVER_GLOW.smoothRate * delta))
  }

  private updateAndDrawCircuit(
    circuit: LiveCircuit,
    time: number,
    delta: number,
    deltaMs: number,
    colors: ThemeColorConfig,
  ) {
    circuit.age += deltaMs

    if (circuit.age >= getCycleDuration(circuit) && this.grid) {
      const reborn = createCircuit(this.grid, circuit.sectorX, circuit.sectorY)
      circuit.path = reborn.path
      circuit.pulse = reborn.pulse
      circuit.fadeInDuration = reborn.fadeInDuration
      circuit.activeDuration = reborn.activeDuration
      circuit.fadeOutDuration = reborn.fadeOutDuration
      circuit.age = 0
    }

    const path = circuit.path
    if (this.prefersReducedMotion || path.totalLength === 0) return

    let hoverProximity = 0
    if (this.pointerX !== null && this.pointerY !== null) {
      hoverProximity = proximityInfluence(
        nearestDistanceToPath(path, this.pointerX, this.pointerY),
        OVERLOAD.radius,
      )
    }
    let targetInfluence = hoverProximity
    for (const burst of this.clickBursts) {
      const spatial = proximityInfluence(
        nearestDistanceToPath(path, burst.x, burst.y),
        OVERLOAD.radius,
      )
      if (spatial <= 0) continue
      const timeDecay = 1 - smoothstep((time - burst.start) / CLICK.burstDuration)
      targetInfluence += spatial * timeDecay * CLICK.surgeMultiplier
    }
    targetInfluence = Math.min(OVERLOAD.maxInfluence, targetInfluence)
    circuit.influence +=
      (targetInfluence - circuit.influence) * (1 - Math.exp(-OVERLOAD.smoothRate * delta))
    if (circuit.influence < 0.001) circuit.influence = 0
    const influence = circuit.influence
    const surge = Math.max(0, influence - 1)
    const surgeVisual = Math.min(1, surge)
    const colorBoost = Math.min(1, influence)

    const opacity = Math.max(
      getOpacity(circuit),
      Math.min(1, surge * 1.4),
      hoverProximity * OVERLOAD.hoverRevealStrength,
    )
    if (opacity <= 0.01) return

    const pulse = circuit.pulse
    const prevDistance = pulse.distance
    const speedMultiplier =
      1 + Math.min(1, influence) * OVERLOAD.speedBoost + surge * CLICK.speedBoost
    pulse.distance += pulse.speed * speedMultiplier * delta

    if (
      !this.prefersReducedMotion &&
      pulse.distance > prevDistance &&
      this.pings.length < PING.max
    ) {
      for (const vd of path.vertexDistances) {
        if (vd > 0 && vd < path.totalLength && vd > prevDistance && vd <= pulse.distance) {
          const p = pointAtDistance(path, vd)
          this.pings.push({ x: p.x, y: p.y, start: time, colorT: colorMixAt(pulse, vd) })
        }
      }
    }

    if (pulse.distance > path.totalLength + PULSE.trailLength) {
      pulse.distance = -Math.random() * 120
    }

    const clamped = Math.max(0, Math.min(pulse.distance, path.totalLength))
    const trailStart = Math.max(0, pulse.distance - PULSE.trailLength)
    const trail = subPath(path, trailStart, clamped)
    const headColorT = colorMixAt(pulse, clamped)
    const ctx = this.ctx

    if (influence > 0.01) {
      let revealDistance = 0
      ctx.lineWidth = 2 + surgeVisual * OVERLOAD.lineThicken * 5
      for (let i = 1; i < path.points.length; i++) {
        revealDistance += Math.hypot(
          path.points[i].x - path.points[i - 1].x,
          path.points[i].y - path.points[i - 1].y,
        )
        const parts = colorHsl(colors, colorMixAt(pulse, revealDistance), colorBoost)
        ctx.strokeStyle = hsla(parts, Math.min(1, OVERLOAD.revealAlpha * influence * opacity))
        ctx.beginPath()
        ctx.moveTo(path.points[i - 1].x, path.points[i - 1].y)
        ctx.lineTo(path.points[i].x, path.points[i].y)
        ctx.stroke()
      }
    }

    const alphaBoost = 1 + influence * OVERLOAD.alphaBoost
    let segmentDistance = trailStart
    const segCount = Math.max(1, trail.length - 1)
    for (let i = 1; i < trail.length; i++) {
      segmentDistance += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y)
      const tRatio = i / segCount
      const parts = colorHsl(colors, colorMixAt(pulse, segmentDistance), colorBoost)
      const alpha = Math.min(1, Math.pow(tRatio, 1.3) * ALPHA.trail * opacity * alphaBoost)

      ctx.strokeStyle = hsla(parts, alpha)
      ctx.lineWidth =
        1.3 + tRatio * 2 * (1 + Math.min(1, influence) * 0.5 + surgeVisual * OVERLOAD.lineThicken)
      ctx.beginPath()
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
      ctx.lineTo(trail[i].x, trail[i].y)
      ctx.stroke()

      if (tRatio > 0.6) {
        const coreAlpha = ((tRatio - 0.6) / 0.4) * alpha * 0.5
        ctx.strokeStyle = `hsla(0, 0%, 100%, ${coreAlpha})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
        ctx.lineTo(trail[i].x, trail[i].y)
        ctx.stroke()
      }
    }

    if (pulse.distance >= 0 && pulse.distance <= path.totalLength) {
      const head = pointAtDistance(path, clamped)
      const parts = colorHsl(colors, headColorT, colorBoost)
      const glowRadius = 8 + Math.min(1, influence) * 6 + surgeVisual * 4

      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, glowRadius)
      glow.addColorStop(0, hsla(parts, Math.min(1, ALPHA.glow * opacity * alphaBoost)))
      glow.addColorStop(1, hsla(parts, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(head.x, head.y, glowRadius, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = hsla(parts, Math.min(1, ALPHA.head * opacity * alphaBoost))
      ctx.beginPath()
      ctx.arc(head.x, head.y, 2 + surgeVisual * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawPings(time: number, colors: ThemeColorConfig) {
    const ctx = this.ctx
    for (const ping of this.pings) {
      const progress = (time - ping.start) / PING.duration
      if (progress >= 1) continue
      const parts = colorHsl(colors, ping.colorT, 0.3)
      ctx.strokeStyle = hsla(parts, (1 - progress) * 0.7)
      ctx.lineWidth = Math.max(0.6, 1.8 * (1 - progress))
      ctx.beginPath()
      ctx.arc(ping.x, ping.y, 2 + progress * 16, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  private drawClickDotRings(time: number) {
    const ctx = this.ctx
    for (const dot of this.clickDots) {
      const progress = (time - dot.start) / CLICK.dotDuration
      if (progress < 0 || progress >= 1) continue
      const eased = smoothstep(progress)
      const ringRadius = dot.startRadius + eased * (dot.maxRadius - dot.startRadius)
      const alpha = dot.baseOpacity * (1 - eased)
      ctx.strokeStyle = hsla({ hue: dot.hue, sat: dot.sat, light: dot.light }, alpha)
      ctx.lineWidth = Math.max(0.5, 1.6 * (1 - progress))
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, ringRadius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  private render = (time: number) => {
    const delta = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 0
    this.lastTime = time
    const colors = THEME_COLORS[this.getTheme()]
    const deltaMs = delta * 1000

    this.clickBursts = this.clickBursts.filter((burst) => time - burst.start < CLICK.burstDuration)
    this.pings = this.pings.filter((ping) => time - ping.start < PING.duration)
    this.clickDots = this.clickDots.filter((dot) => time - dot.start < CLICK.dotDuration)

    this.updateParallax(delta)
    this.updateHoverGlow(delta)

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)
    this.drawGrid()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.save()
    ctx.translate(this.parallaxX, this.parallaxY)

    for (const circuit of this.circuits) {
      this.updateAndDrawCircuit(circuit, time, delta, deltaMs, colors)
    }

    this.drawPings(time, colors)
    this.drawClickDotRings(time)

    ctx.restore()

    if (this.pointerX !== null && this.pointerY !== null) {
      this.drawHoverGlow(this.pointerX, this.pointerY, this.hoverGlowStrength)
    }

    this.animationFrame = requestAnimationFrame(this.render)
  }

  private handleResize = () => {
    window.clearTimeout(this.resizeTimeout)
    this.resizeTimeout = window.setTimeout(this.setup, 200)
  }

  private handleVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.animationFrame)
    } else {
      this.lastTime = 0
      this.animationFrame = requestAnimationFrame(this.render)
    }
  }

  private handlePointerMove = (e: PointerEvent) => {
    this.pointerX = e.clientX
    this.pointerY = e.clientY
  }

  private handlePointerLeave = () => {
    this.pointerX = null
    this.pointerY = null
  }

  private handleClick = (e: MouseEvent) => {
    const time = performance.now()
    this.clickBursts.push({ x: e.clientX, y: e.clientY, start: time })
    if (!this.prefersReducedMotion) {
      this.spawnClickDots(e.clientX, e.clientY, THEME_COLORS[this.getTheme()], time)
    }
  }
}
