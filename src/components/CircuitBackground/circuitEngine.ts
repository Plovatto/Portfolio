import type { Theme } from '../../context/theme-context'
import {
  BOARD,
  CARD,
  FLASHLIGHT,
  FRAME_BUDGET,
  MOTION,
  HUE,
  INNER,
  PALETTE,
  PULSE,
  SPINE,
  WAVE,
} from './config'
import type { Palette } from './config'
import { generateBoard, generateInner } from './generateBoard'
import { distanceAt, perimeter, pointAt } from './geometry'
import type { RoundRect } from './geometry'
import { TileLayer, buildChunks, drawChunks, pathFrom } from './layers'
import type { Chunk, ChunkStyle } from './layers'
import { clamp, easeOutCubic, hsla } from './math'
import { measurePins, toBoardScroll } from './pins'
import type { PinRange } from './pins'
import { PulseSystem } from './pulses'
import { scanDom } from './scanDom'
import { GlowSprites } from './sprites'
import type { BoardChip, BoardData, ChipSpec } from './types'
import { drawWaveEdges, graphWave, radialWave, waveDone, waveFront } from './waves'
import type { Wave, WaveEdges } from './waves'

interface CardVisual {
  chip: BoardChip
  stubs: Path2D
  dots: Path2D
  tap: Path2D | null
  ports: number[]
  tapPort: number
  border: RoundRect
  length: number
  hoverEdges: WaveEdges | null | undefined
  glow: number
  flash: number
  halo: HTMLCanvasElement | null
  haloTheme: Theme | null
  shown: number
}

interface Comet {
  card: CardVisual
  start: number
  from: number
  dir: 1 | -1
  hue: number
  met: boolean
}

interface Launch {
  at: number
  card: CardVisual
  from: number
}

interface Boot {
  start: number
  x: number
  y: number
  maxR: number
  edges: WaveEdges | null
}

interface Pointer {
  x: number
  y: number
  fine: boolean
}

const HALO_SCALE = 0.25

function buildCardVisual(chip: BoardChip): CardVisual {
  const { spec, pins } = chip
  const o = CARD.outset
  const w = spec.right - spec.left + o * 2
  const h = spec.bottom - spec.top + o * 2
  const border: RoundRect = {
    x: spec.left - o,
    y: spec.top - o,
    w,
    h,
    r: Math.min(spec.radius + o, w / 2, h / 2),
  }
  const stubs = new Path2D()
  const dots = new Path2D()
  for (const pin of pins) {
    stubs.moveTo(pin.x, pin.y)
    stubs.lineTo(pin.ex, pin.ey)
    dots.moveTo(pin.ex + CARD.portRadius, pin.ey)
    dots.arc(pin.ex, pin.ey, CARD.portRadius, 0, Math.PI * 2)
  }
  const ports = pins.map((pin) => distanceAt(border, pin.ex, pin.ey))
  const tapEnd = chip.tap ? [chip.tap[chip.tap.length - 2], chip.tap[chip.tap.length - 1]] : null
  const tapIndex = tapEnd ? pins.findIndex((p) => p.x === tapEnd[0] && p.y === tapEnd[1]) : -1

  return {
    chip,
    stubs,
    dots,
    tap: chip.tap ? pathFrom([chip.tap]) : null,
    ports,
    tapPort: tapIndex >= 0 ? ports[tapIndex] : (ports[0] ?? 0),
    border,
    length: perimeter(border),
    hoverEdges: undefined,
    glow: 0,
    flash: 0,
    halo: null,
    haloTheme: null,
    shown: 0,
  }
}

function isShown(el: HTMLElement): boolean {
  return (
    !el.classList.contains('rv-fade') ||
    el.classList.contains('seen') ||
    !document.documentElement.classList.contains('reveal')
  )
}

function renderHalo(spec: ChipSpec, palette: Palette): HTMLCanvasElement {
  const s = HALO_SCALE
  const pad = CARD.haloPad
  const w = spec.right - spec.left
  const h = spec.bottom - spec.top
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((w + pad * 2) * s)
  canvas.height = Math.ceil((h + pad * 2) * s)
  const ctx = canvas.getContext('2d')!
  ctx.scale(s, s)
  const light = palette.signalLight
  const grad = ctx.createLinearGradient(pad, pad, pad + w, pad + h)
  grad.addColorStop(0, hsla(HUE.from, 100, light, 1))
  grad.addColorStop(1, hsla(HUE.to, 100, light, 1))
  ctx.fillStyle = grad
  const supportsFilter = typeof (ctx as { filter?: unknown }).filter === 'string'
  if (supportsFilter) {
    ctx.filter = `blur(${CARD.haloBlur * s}px)`
  } else {
    ctx.shadowColor = hsla((HUE.from + HUE.to) / 2, 100, light, 1)
    ctx.shadowBlur = CARD.haloBlur * 2 * s
  }
  ctx.beginPath()
  ctx.roundRect(pad, pad, w, h, spec.radius)
  ctx.fill()
  ctx.filter = 'none'
  ctx.shadowBlur = 0
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.roundRect(pad, pad, w, h, spec.radius)
  ctx.fill()
  return canvas
}

function boardStyle(p: Palette): ChunkStyle {
  return {
    trace: p.trace,
    via: p.via,
    pad: p.pad,
    part: p.part,
    silk: p.silk,
    substrate: p.substrate,
  }
}

function innerStyle(p: Palette): ChunkStyle {
  return {
    trace: p.inner,
    via: p.innerVia,
    pad: p.innerVia,
    part: p.inner,
    silk: null,
    substrate: null,
  }
}

const LAYOUT_CHECK_MS = 700

interface LayoutBox {
  x: number
  y: number
  w: number
  h: number
}

function layoutBox(el: HTMLElement): LayoutBox {
  const anchor = el.closest<HTMLElement>('[data-board-pin]') ?? el
  let x = 0
  let y = 0
  for (
    let node: HTMLElement | null = anchor;
    node;
    node = node.offsetParent as HTMLElement | null
  ) {
    x += node.offsetLeft
    y += node.offsetTop
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

const sameBox = (a: LayoutBox, b: LayoutBox) =>
  Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && a.w === b.w && a.h === b.h

export class CircuitEngine {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly getTheme: () => Theme
  private readonly label: string
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private readonly coarse = window.matchMedia('(pointer: coarse)').matches
  private readonly sprites = new GlowSprites()
  private readonly pulses = new PulseSystem()
  private readonly powered = new Set<string>()

  private board: BoardData | null = null
  private chunks: Chunk[] = []
  private boardTiles: TileLayer | null = null
  private innerTiles: TileLayer | null = null
  private nodeBuckets: number[][] = []
  private cards: CardVisual[] = []
  private pins: PinRange[] = []
  private spinePath: Path2D | null = null
  private waves: Wave[] = []
  private comets: Comet[] = []
  private launches: Launch[] = []
  private boot: Boot | null = null
  private booted = false
  private hovered: CardVisual | null = null
  private lastHoverWave = 0

  private pointer: Pointer | null = null
  private lastSpawn = 0
  private lastSpawnX = 0
  private lastSpawnY = 0
  private glow = 0
  private parX = 0
  private parY = 0

  private vw = 0
  private vh = 0
  private dpr = 1
  private docW = 0
  private docH = 0
  private raf = 0
  private last = 0
  private dirty = true
  private lastScroll = -1
  private motion = 1
  private lastTheme: Theme | null = null
  private regenTimer: number | undefined
  private observer: ResizeObserver | null = null
  private layoutBoxes = new Map<HTMLElement, LayoutBox>()
  private layoutTimer = 0
  private running = false
  private pageScroll = 0
  private lowPower = false
  private sampled = 0
  private slow = 0

  constructor(canvas: HTMLCanvasElement, getTheme: () => Theme, label: string) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.getTheme = getTheme
    this.label = label
  }

  start() {
    this.running = true
    this.measure()
    this.pageScroll = window.scrollY

    window.addEventListener('scroll', this.handleScroll, { passive: true })
    window.addEventListener('resize', this.handleResize)
    document.addEventListener('visibilitychange', this.handleVisibility)
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', this.handlePointerDown, { passive: true })
    window.addEventListener('blur', this.handlePointerLeave)
    document.documentElement.addEventListener('mouseleave', this.handlePointerLeave)
    document.addEventListener('pointerover', this.handlePointerOver)
    document.addEventListener('focusin', this.handleFocusIn)
    document.addEventListener('focusout', this.handleFocusOut)

    const fontsReady = Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, 700)),
    ])
    fontsReady.then(() => {
      if (!this.running) return
      this.generate()
      this.observer = new ResizeObserver(this.checkLayout)
      this.observeLayout()
      this.layoutTimer = window.setInterval(this.checkLayout, LAYOUT_CHECK_MS)
      this.raf = requestAnimationFrame(this.frame)
    })
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.regenTimer)
    window.clearInterval(this.layoutTimer)
    this.observer?.disconnect()
    window.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerdown', this.handlePointerDown)
    window.removeEventListener('blur', this.handlePointerLeave)
    document.documentElement.removeEventListener('mouseleave', this.handlePointerLeave)
    document.removeEventListener('pointerover', this.handlePointerOver)
    document.removeEventListener('focusin', this.handleFocusIn)
    document.removeEventListener('focusout', this.handleFocusOut)
  }

  private measure() {
    this.dpr = this.lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    this.vw = window.innerWidth
    this.vh = window.innerHeight
    this.canvas.width = Math.round(this.vw * this.dpr)
    this.canvas.height = Math.round(this.vh * this.dpr)
    this.canvas.style.width = `${this.vw}px`
    this.canvas.style.height = `${this.vh}px`
    this.dirty = true
  }

  private generate() {
    const root = document.documentElement
    this.docW = root.clientWidth
    this.docH = Math.max(root.scrollHeight, this.vh)
    this.pins = measurePins()
    this.pageScroll = window.scrollY
    const { chips, quiets } = scanDom(this.pins)

    const board = generateBoard({
      width: this.docW,
      height: this.docH,
      cell: this.coarse ? BOARD.cellCoarse : BOARD.cell,
      chips,
      quiets,
      label: this.label,
      spine: !this.coarse,
    })
    this.board = board
    this.chunks = buildChunks(board, BOARD.chunkHeight)
    this.boardTiles = new TileLayer(this.chunks, this.docW, BOARD.chunkHeight, this.dpr)

    const pad = INNER.parallax * 2
    const innerWidth = this.docW + pad * 2
    const innerHeight = this.vh + (this.docH - this.vh) * INNER.scroll + pad * 2
    const innerChunks = buildChunks(generateInner(innerWidth, innerHeight), BOARD.chunkHeight)
    this.innerTiles = new TileLayer(innerChunks, innerWidth, BOARD.chunkHeight, 1)

    this.nodeBuckets = []
    board.graph.nodeY.forEach((y, node) => {
      if (!board.graph.adj[node].length) return
      const i = Math.floor(y / BOARD.chunkHeight)
      while (this.nodeBuckets.length <= i) this.nodeBuckets.push([])
      this.nodeBuckets[i].push(node)
    })

    this.cards = board.chips.map(buildCardVisual)
    const tracked = [
      ...board.chips.map(({ spec }) => spec.el),
      ...document.querySelectorAll<HTMLElement>('[data-quiet]'),
    ]
    this.layoutBoxes = new Map(tracked.map((el) => [el, layoutBox(el)]))
    this.observeLayout()
    for (const card of this.cards) {
      if (this.powered.has(card.chip.spec.ref)) card.glow = CARD.baseGlow
      if (isShown(card.chip.spec.el)) card.shown = 1
    }
    this.spinePath = board.spine ? pathFrom(board.spine.map((line) => line.points)) : null
    this.pulses.reset(board.graph)
    this.waves = []
    this.comets = []
    this.launches = []
    this.hovered = null

    if (!this.booted) this.startBoot()
    this.dirty = true
  }

  private observeLayout() {
    const observer = this.observer
    if (!observer) return
    observer.disconnect()
    observer.observe(document.body)
    for (const el of this.layoutBoxes.keys()) observer.observe(el)
  }

  private checkLayout = () => {
    const root = document.documentElement
    if (document.hidden || !this.board) return
    const moved = [...this.layoutBoxes].some(
      ([el, box]) => el.isConnected && !sameBox(layoutBox(el), box),
    )
    if (moved || root.clientWidth !== this.docW || root.scrollHeight !== this.docH) {
      this.scheduleRegen()
    }
  }

  private scheduleRegen() {
    window.clearTimeout(this.regenTimer)
    this.regenTimer = window.setTimeout(() => {
      this.measure()
      this.generate()
    }, 160)
  }

  private startBoot() {
    const hero = this.cards.find((c) => c.chip.spec.hero)
    if (!hero || this.reduced || !this.board) {
      this.finishBoot()
      return
    }
    const { spec } = hero.chip
    const x = (spec.left + spec.right) / 2
    const y = (spec.top + spec.bottom) / 2
    const sy = this.boardScroll()
    const maxR =
      Math.max(
        Math.hypot(x, y - sy),
        Math.hypot(this.vw - x, y - sy),
        Math.hypot(x, sy + this.vh - y),
        Math.hypot(this.vw - x, sy + this.vh - y),
      ) + 80
    const start = this.boot?.start ?? performance.now() + WAVE.boot.delay
    this.boot = { start, x, y, maxR, edges: radialWave(this.board.graph, x, y) }
  }

  private finishBoot() {
    this.boot = null
    this.booted = true
    const hero = this.cards.find((c) => c.chip.spec.hero)
    if (hero) this.powerOn(hero, performance.now())
  }

  private powerOn(card: CardVisual, now: number) {
    const { ref, el } = card.chip.spec
    if (this.powered.has(ref)) return
    this.powered.add(ref)
    el.dataset.powered = 'true'
    this.dirty = true
    if (this.reduced || !this.board) return
    const edges = graphWave(this.board.graph, card.chip.pinNodes, WAVE.power.maxD)
    this.addWave(edges, WAVE.power, true, now)
    const arrival = edges ? (edges.maxD / WAVE.power.speed) * 1000 : 0
    this.launches.push({ at: now + arrival, card, from: card.tapPort })
  }

  private updatePower(now: number, scrollY: number) {
    if (!this.booted || !this.board) return
    const progress = scrollY + this.vh * SPINE.progress
    for (const card of this.cards) {
      const { chip } = card
      if (this.powered.has(chip.spec.ref) || !isShown(chip.spec.el)) continue
      const ready =
        this.board.spine && chip.tapY !== null
          ? chip.tapY <= progress
          : chip.spec.top <= scrollY + this.vh * 0.82
      if (ready) this.powerOn(card, now)
    }

    const hovered = this.hovered
    if (hovered && !this.reduced && now - this.lastHoverWave > WAVE.hover.interval) {
      this.lastHoverWave = now
      const edges = this.hoverEdges(hovered)
      this.addWave(edges, WAVE.hover, true, now)
      if (hovered.ports.length) {
        const from = hovered.ports[Math.floor(Math.random() * hovered.ports.length)]
        const arrival = edges ? (edges.maxD / WAVE.hover.speed) * 1000 : 0
        this.launches.push({ at: now + arrival, card: hovered, from })
      }
    }

    if (this.launches.length) {
      this.launches = this.launches.filter((l) => {
        if (now < l.at) return true
        this.launchComets(l.card, l.from, now)
        return false
      })
    }
  }

  private hoverEdges(card: CardVisual): WaveEdges | null {
    if (card.hoverEdges === undefined && this.board) {
      card.hoverEdges = graphWave(this.board.graph, card.chip.pinNodes, WAVE.hover.maxD)
    }
    return card.hoverEdges ?? null
  }

  private boardScroll() {
    return toBoardScroll(this.pageScroll, this.pins)
  }

  private launchComets(card: CardVisual, from: number, now: number) {
    const { spec } = card.chip
    if (spec.bare) {
      const pin = card.chip.pins[card.ports.indexOf(from)]
      const detail = pin
        ? { x: pin.ex - spec.left, y: pin.ey - spec.top }
        : { x: (spec.right - spec.left) / 2, y: 0 }
      spec.el.dispatchEvent(new CustomEvent('board:current', { detail }))
      return
    }
    if (this.reduced) return
    while (this.comets.length > CARD.maxComets - 2) this.comets.shift()
    this.comets.push(
      { card, start: now, from, dir: 1, hue: HUE.from + 4, met: false },
      { card, start: now, from, dir: -1, hue: HUE.to - 4, met: false },
    )
    card.flash = Math.max(card.flash, 0.5)
  }

  private addWave(
    edges: WaveEdges | null,
    config: { speed: number; trail: number },
    inward: boolean,
    now: number,
  ) {
    if (!edges) return
    this.waves.push({ edges, start: now, speed: config.speed, trail: config.trail, inward })
    if (this.waves.length > WAVE.max) this.waves.shift()
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const interval = this.last ? now - this.last : 0
    const dt = Math.min(interval / 1000, 0.05)
    this.last = now
    this.watchFrameBudget(interval)

    const theme = this.getTheme()
    const scrollY = this.boardScroll()
    this.trackMotion(scrollY, interval)
    if (theme !== this.lastTheme || scrollY !== this.lastScroll) this.dirty = true
    this.lastTheme = theme
    this.lastScroll = scrollY

    this.updatePower(now, scrollY)
    if (this.reduced && !this.dirty) return
    this.dirty = false
    this.draw(now, dt, scrollY, theme)
  }

  private trackMotion(scrollY: number, interval: number) {
    if (this.lastScroll < 0 || interval <= 0) return
    const speed = Math.abs(scrollY - this.lastScroll) / (interval / 1000)
    const target = clamp(1 - (speed - MOTION.calm) / (MOTION.fast - MOTION.calm), MOTION.min, 1)
    const rate = target < this.motion ? MOTION.dimRate : MOTION.restoreRate
    this.motion += (target - this.motion) * (1 - Math.exp((-rate * Math.min(interval, 100)) / 1000))
  }

  private draw(now: number, dt: number, scrollY: number, theme: Theme) {
    const ctx = this.ctx
    const palette = PALETTE[theme]
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.vw, this.vh)
    const board = this.board
    if (!board || !this.boardTiles || !this.innerTiles) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    this.updatePointerEffects(dt)

    const sy = Math.round(scrollY * this.dpr) / this.dpr
    const top = sy
    const bottom = sy + this.vh

    const pad = INNER.parallax * 2
    const innerTop = scrollY * INNER.scroll + pad - this.parY
    ctx.save()
    ctx.translate(this.parX - pad, -innerTop)
    this.innerTiles.draw(ctx, innerTop, innerTop + this.vh, innerStyle(palette), theme)
    ctx.restore()

    ctx.save()
    ctx.translate(0, -sy)

    let bootR = -1
    if (this.boot) {
      const p = (now - this.boot.start) / WAVE.boot.duration
      if (p >= 1) this.finishBoot()
      else bootR = easeOutCubic(Math.max(0, p)) * this.boot.maxR
    }
    const boot = this.boot

    if (boot) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(boot.x, boot.y, Math.max(1, bootR), 0, Math.PI * 2)
      ctx.clip()
    }
    this.boardTiles.draw(ctx, top, bottom, boardStyle(palette), theme)
    ctx.lineWidth = BOARD.traceWidth
    ctx.strokeStyle = palette.trace
    ctx.fillStyle = palette.pad
    for (const card of this.cards) {
      ctx.stroke(card.stubs)
      ctx.fill(card.dots)
    }
    if (!boot) this.drawFlashlight(palette, scrollY)
    this.drawSpine(now, scrollY + this.vh * SPINE.progress, palette)
    if (boot) ctx.restore()

    ctx.globalCompositeOperation = palette.additive ? 'lighter' : 'source-over'
    this.drawHalos(dt, top, bottom, palette, theme)
    this.drawLitPorts(palette)
    if (boot?.edges) {
      drawWaveEdges(ctx, boot.edges, bootR, WAVE.boot.trail, false, palette, this.sprites)
    }
    this.waves = this.waves.filter((w) => !waveDone(w, now))
    for (const w of this.waves) {
      drawWaveEdges(ctx, w.edges, waveFront(w, now), w.trail, w.inward, palette, this.sprites)
    }
    if (!this.reduced && !boot) {
      this.maintainPulses(now, top, bottom)
      this.pulses.update(dt, now, top, bottom)
      this.pulses.draw(ctx, palette, this.sprites)
    }
    this.drawComets(now, palette)
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()

    this.drawCursorGlow(palette)
  }

  private updatePointerEffects(dt: number) {
    const p = this.pointer
    const active = p !== null && p.fine
    const ease = this.reduced ? 1 : 1 - Math.exp(-3 * dt)
    let tx = 0
    let ty = 0
    if (active && !this.reduced) {
      tx = ((p.x - this.vw / 2) / (this.vw / 2)) * INNER.parallax
      ty = ((p.y - this.vh / 2) / (this.vh / 2)) * INNER.parallax
    }
    this.parX += (tx - this.parX) * ease
    this.parY += (ty - this.parY) * ease
    this.glow += ((active ? 1 : 0) - this.glow) * ease
  }

  private drawHalos(dt: number, top: number, bottom: number, palette: Palette, theme: Theme) {
    const ctx = this.ctx
    const ease = this.reduced ? 1 : 1 - Math.exp(-6 * dt)
    const decay = this.reduced ? 0 : Math.exp(-2.2 * dt)
    const pad = CARD.haloPad

    for (const card of this.cards) {
      const { spec } = card.chip
      if (spec.bare) continue
      const target =
        (this.powered.has(spec.ref) ? CARD.baseGlow : 0) +
        (card === this.hovered ? CARD.hoverGlow : 0)
      card.glow += (target - card.glow) * ease
      card.flash *= decay
      card.shown += ((isShown(spec.el) ? 1 : 0) - card.shown) * ease
      const alpha =
        Math.min(1, card.glow + card.flash * 0.55) * card.shown * this.motion * palette.halo
      if (alpha < 0.01 || spec.bottom + pad < top || spec.top - pad > bottom) continue
      if (!card.halo || card.haloTheme !== theme) {
        card.halo = renderHalo(spec, palette)
        card.haloTheme = theme
      }
      ctx.globalAlpha = alpha
      ctx.drawImage(
        card.halo,
        spec.left - pad,
        spec.top - pad,
        spec.right - spec.left + pad * 2,
        spec.bottom - spec.top + pad * 2,
      )
    }
    ctx.globalAlpha = 1
  }

  private drawLitPorts(palette: Palette) {
    const ctx = this.ctx
    const { signalSat: sat, signalLight: light } = palette
    for (const card of this.cards) {
      if (!this.powered.has(card.chip.spec.ref)) continue
      const hot = card === this.hovered
      const strength = Math.min(1, (hot ? 0.95 : 0.5) + card.flash * 0.5)
      const color = hsla(HUE.from + 10, sat, light + 8, strength)
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = BOARD.traceWidth
      ctx.stroke(card.stubs)
      ctx.fill(card.dots)
      if (card.tap) {
        ctx.lineWidth = SPINE.width
        ctx.stroke(card.tap)
      }
      if (hot || card.flash > 0.2) {
        const glowAlpha = (hot ? 0.7 : card.flash) * palette.glowAlpha
        for (const pin of card.chip.pins) {
          this.sprites.draw(ctx, HUE.from + 10, light, pin.ex, pin.ey, 9, glowAlpha)
        }
      }
    }
  }

  private drawComets(now: number, palette: Palette) {
    if (!this.comets.length) return
    const ctx = this.ctx
    const { signalSat: sat, signalLight: light } = palette
    const L = CARD.cometLength
    const steps = 16

    this.comets = this.comets.filter((c) => {
      const { card } = c
      const travel = card.length / 2
      const s = ((now - c.start) / 1000) * CARD.cometSpeed
      if (s > travel + L) return false
      if (s >= travel && !c.met) {
        c.met = true
        if (c.dir === 1) card.flash = 1
      }
      const head = Math.min(s, travel)
      const tail = Math.min(L, s) - Math.max(0, s - travel)
      if (tail <= 0) return true
      const fade = s < travel ? 1 : 1 - (s - travel) / L

      let prev = pointAt(card.border, c.from + c.dir * head)
      const headPoint = prev
      for (let k = 1; k <= steps; k++) {
        const t = k / steps
        const point = pointAt(card.border, c.from + c.dir * (head - tail * t))
        ctx.strokeStyle = hsla(c.hue, sat, light + (k < 4 ? 18 : 4), (1 - t) * 0.95 * fade)
        ctx.lineWidth = 2.6 - t * 1.6
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
        prev = point
      }
      this.sprites.draw(ctx, c.hue, light, headPoint.x, headPoint.y, 18, palette.glowAlpha * fade)
      return true
    })
  }

  private drawFlashlight(palette: Palette, scrollY: number) {
    const p = this.pointer
    if (!p || !p.fine || this.glow < 0.01) return
    const ctx = this.ctx
    const x = p.x
    const y = p.y + scrollY
    const R = FLASHLIGHT.radius
    const { signalSat: sat, signalLight: light, flashlight: alpha } = palette
    const g = ctx.createRadialGradient(x, y, 0, x, y, R)
    g.addColorStop(0, hsla(HUE.from + 6, sat, light + 10, alpha))
    g.addColorStop(0.45, hsla((HUE.from + HUE.to) / 2, sat, light, alpha * 0.45))
    g.addColorStop(1, hsla(HUE.to, sat, light, 0))

    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = this.glow
    drawChunks(ctx, this.chunks, y - R, y + R, {
      trace: g,
      via: g,
      pad: g,
      part: g,
      silk: g,
      substrate: null,
    })
    ctx.strokeStyle = g
    ctx.fillStyle = g
    ctx.lineWidth = BOARD.traceWidth
    for (const card of this.cards) {
      ctx.stroke(card.stubs)
      ctx.fill(card.dots)
    }
    ctx.restore()
  }

  private drawSpine(now: number, progress: number, palette: Palette) {
    const lines = this.board?.spine
    if (!this.spinePath || !lines) return
    const ctx = this.ctx
    const { signalSat: sat, signalLight: light } = palette
    const top = Math.min(...lines.map((l) => l.points[1])) - 20

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top, this.docW, Math.max(0, progress - top))
    ctx.clip()
    ctx.lineWidth = SPINE.width
    ctx.strokeStyle = hsla(HUE.from + 8, sat, light, palette.additive ? 0.4 : 0.5)
    ctx.stroke(this.spinePath)
    if (!this.reduced) {
      ctx.setLineDash(SPINE.dash)
      ctx.lineDashOffset = -now * SPINE.flow
      ctx.lineWidth = 2
      ctx.strokeStyle = hsla(HUE.from + 4, sat, light + 16, 0.95)
      ctx.stroke(this.spinePath)
      ctx.setLineDash([])
    }
    ctx.restore()

    for (const line of lines) {
      if (progress > line.top && progress < line.bottom) {
        this.sprites.draw(ctx, HUE.from, light, line.x, progress, 16, palette.glowAlpha)
      }
    }
  }

  private maintainPulses(now: number, top: number, bottom: number) {
    const target = clamp(
      Math.round((this.vw * this.vh) / PULSE.perArea),
      PULSE.min,
      this.coarse ? PULSE.min + 6 : PULSE.max,
    )
    const budget = this.lowPower ? Math.ceil(target / 2) : target
    for (let attempt = 0; attempt < 4 && this.pulses.count < budget; attempt++) {
      const node = this.randomNodeBetween(top, bottom)
      if (node >= 0) this.pulses.spawn(node, now)
    }
  }

  private randomNodeBetween(top: number, bottom: number): number {
    const graph = this.board?.graph
    if (!graph) return -1
    const y = top + Math.random() * (bottom - top)
    const bucket = this.nodeBuckets[Math.floor(y / BOARD.chunkHeight)]
    if (!bucket?.length) return -1
    const node = bucket[Math.floor(Math.random() * bucket.length)]
    const ny = graph.nodeY[node]
    return ny >= top - 40 && ny <= bottom + 40 ? node : -1
  }

  private drawCursorGlow(palette: Palette) {
    const p = this.pointer
    if (!p || !p.fine || this.glow < 0.01) return
    const ctx = this.ctx
    const R = 170
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R)
    const alpha = (palette.additive ? 0.12 : 0.07) * this.glow
    const hue = (HUE.from + HUE.to) / 2
    g.addColorStop(0, hsla(hue, 100, 60, alpha))
    g.addColorStop(1, hsla(hue, 100, 60, 0))
    ctx.fillStyle = g
    ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2)
  }

  private nearestNode(wx: number, wy: number, radius: number): number {
    const board = this.board
    if (!board) return -1
    const cx = Math.round(wx / board.cell)
    const cy = Math.round(wy / board.cell)
    let best = -1
    let bestD = Infinity
    for (let dy = -radius; dy <= radius; dy++) {
      const y = cy + dy
      if (y < 0 || y >= board.rows) continue
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx
        if (x < 0 || x >= board.cols) continue
        const node = board.nodeOf[y * board.cols + x]
        if (node < 0 || !board.graph.adj[node].length) continue
        const d = dx * dx + dy * dy
        if (d < bestD) {
          bestD = d
          best = node
        }
      }
    }
    return best
  }

  private cardFrom(target: EventTarget | null): CardVisual | null {
    const el = target instanceof Element ? target.closest('[data-chip]') : null
    return el ? (this.cards.find((c) => c.chip.spec.el === el) ?? null) : null
  }

  private setHovered(card: CardVisual | null) {
    if (card === this.hovered) return
    this.hovered = card
    this.dirty = true
    if (!card) return
    const now = performance.now()
    this.powerOn(card, now)
    this.lastHoverWave = now
    if (this.reduced) return
    this.addWave(this.hoverEdges(card), WAVE.hover, true, now)
    const p = this.pointer
    const from = p ? distanceAt(card.border, p.x, p.y + this.boardScroll()) : card.tapPort
    this.launchComets(card, from, now)
  }

  private handleScroll = () => {
    this.pageScroll = window.scrollY
  }

  private handleResize = () => {
    this.measure()
    this.scheduleRegen()
  }

  private watchFrameBudget(interval: number) {
    if (this.lowPower || this.boot || interval <= 0 || interval > FRAME_BUDGET.ignoreAbove) return
    this.sampled++
    if (interval > FRAME_BUDGET.slowFrame) this.slow++
    if (this.sampled < FRAME_BUDGET.window) return
    if (this.slow / this.sampled > FRAME_BUDGET.slowShare) this.enterLowPower()
    this.sampled = 0
    this.slow = 0
  }

  private enterLowPower() {
    this.lowPower = true
    this.measure()
    if (this.chunks.length) {
      this.boardTiles = new TileLayer(this.chunks, this.docW, BOARD.chunkHeight, this.dpr)
    }
  }

  private handleVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
    } else {
      this.last = 0
      this.sampled = 0
      this.slow = 0
      this.dirty = true
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  private handlePointerMove = (e: PointerEvent) => {
    const fine = e.pointerType === 'mouse' || e.pointerType === 'pen'
    this.pointer = { x: e.clientX, y: e.clientY, fine }
    this.dirty = true
    if (!fine || this.reduced || !this.booted) return

    const now = performance.now()
    const moved = Math.hypot(e.clientX - this.lastSpawnX, e.clientY - this.lastSpawnY)
    if (now - this.lastSpawn < PULSE.hoverInterval || moved < PULSE.hoverDistance) return
    this.lastSpawn = now
    this.lastSpawnX = e.clientX
    this.lastSpawnY = e.clientY
    const node = this.nearestNode(e.clientX, e.clientY + this.boardScroll(), 5)
    if (node >= 0) this.pulses.spawn(node, now, 1.4, HUE.from + Math.random() * 20)
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || this.reduced || !this.board || !this.booted) return
    const now = performance.now()
    const wx = e.clientX
    const wy = e.clientY + this.boardScroll()
    let node = this.nearestNode(wx, wy, 10)
    if (node < 0) node = this.nearestNode(wx, wy, 24)
    if (node < 0) return
    this.addWave(graphWave(this.board.graph, [node], WAVE.click.maxD), WAVE.click, false, now)
    for (let i = 0; i < 4; i++) this.pulses.spawn(node, now, 1.8)
  }

  private handlePointerLeave = () => {
    this.pointer = null
    this.setHovered(null)
    this.dirty = true
  }

  private handlePointerOver = (e: PointerEvent) => this.setHovered(this.cardFrom(e.target))
  private handleFocusIn = (e: FocusEvent) => this.setHovered(this.cardFrom(e.target))
  private handleFocusOut = (e: FocusEvent) => this.setHovered(this.cardFrom(e.relatedTarget))
}
