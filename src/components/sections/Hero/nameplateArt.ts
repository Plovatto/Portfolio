import { svgEl } from '../../../lib/svg'
import { easeOutQuad, linear, tween } from '../../../lib/tween'

const FONT_SIZE = 120
const FONT_FAMILY = 'Chakra Petch'

interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

interface DoubleT {
  c1: number
  c2: number
  top: number
  bar: number
  left: number
  right: number
}

interface Trace {
  path: SVGPathElement
  layer: SVGGElement
  length: number
  at1: number
  at2: number
}

export class NameplateArt {
  private readonly svg: SVGSVGElement
  private readonly name: string
  private readonly reduced: boolean
  private view: ViewBox = { x: 0, y: 0, w: 0, h: 0 }
  private litMask!: SVGMaskElement
  private flashMask!: SVGMaskElement
  private tt!: DoubleT
  private trace!: Trace
  private lit = false
  private signing = false
  private destroyed = false
  private timers = new Set<number>()

  constructor(svg: SVGSVGElement, name: string, reduced: boolean) {
    this.svg = svg
    this.name = name
    this.reduced = reduced
    this.build()
  }

  get isLit() {
    return this.lit
  }

  destroy() {
    this.destroyed = true
    for (const id of this.timers) clearTimeout(id)
    this.svg.replaceChildren()
  }

  toSvg(x: number, y: number, renderedWidth: number) {
    const scale = this.view.w / renderedWidth
    return { x: this.view.x + x * scale, y: this.view.y + y * scale }
  }

  isOverDoubleT(x: number) {
    return x > this.tt.left && x < this.tt.right
  }

  randomEdgePoint() {
    const { x, y, w, h } = this.view
    return { x: x + w * Math.random(), y: Math.random() < 0.5 ? y : y + h }
  }

  ignite(x: number, y: number) {
    if (this.destroyed) return
    const radius = this.view.w * 0.75
    const ring = svgEl(
      'circle',
      {
        cx: x,
        cy: y,
        r: 0,
        fill: 'none',
        stroke: '#fff',
        'stroke-width': 44,
        opacity: 0,
        filter: 'url(#mblur)',
      },
      this.flashMask,
    )
    tween(
      1400,
      (e, k) => {
        ring.setAttribute('r', String(e * radius))
        ring.setAttribute('opacity', String((k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.9))
      },
      easeOutQuad,
    ).then(() => ring.remove())

    const distance = Math.max(0, Math.min(Math.abs(this.tt.c1 - x), Math.abs(this.tt.c2 - x)) - 40)
    this.later(
      () => this.signature(),
      (1 - Math.pow(1 - Math.min(1, distance / radius), 1 / 3)) * 600,
    )

    if (this.lit) return
    this.lit = true
    const power = svgEl(
      'circle',
      { cx: x, cy: y, r: 0, fill: '#fff', filter: 'url(#mblur)' },
      this.litMask,
    )
    tween(this.reduced ? 1 : 1400, (e) => power.setAttribute('r', String(e * this.view.w * 1.3)))
  }

  signature() {
    if (this.destroyed || this.signing) return
    this.signing = true
    const { c1, c2 } = this.tt
    if (this.reduced) {
      this.crackle(c1)
      this.crackle(c2)
      this.signing = false
      return
    }
    const { path, layer, length, at1, at2 } = this.trace
    const duration = length / 0.55
    for (const [className, segment] of [
      ['tt-trail', 70],
      ['tt-core', 16],
    ] as const) {
      const pulse = svgEl('path', { d: path.getAttribute('d') ?? '', class: className }, layer)
      pulse.style.strokeDasharray = `${segment}px ${length + segment}px`
      pulse
        .animate([{ strokeDashoffset: `${segment}px` }, { strokeDashoffset: `${-length}px` }], {
          duration,
          easing: 'linear',
        })
        .finished.then(
          () => pulse.remove(),
          () => pulse.remove(),
        )
    }
    this.later(() => this.crackle(c1), duration * at1)
    this.later(() => this.crackle(c2), duration * at2)
    this.later(() => (this.signing = false), duration * 0.6)
  }

  private build() {
    this.svg.replaceChildren()
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.font = `700 ${FONT_SIZE}px "${FONT_FAMILY}"`
    const m = ctx.measureText(this.name)
    const ascent = m.actualBoundingBoxAscent
    const descent = Math.max(0, m.actualBoundingBoxDescent)
    this.view = {
      x: -m.actualBoundingBoxLeft - 2,
      y: FONT_SIZE - ascent - 2,
      w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight + 4,
      h: ascent + descent + 4,
    }
    const { x, y, w, h } = this.view
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`)

    const defs = svgEl('defs', {}, this.svg)
    const gradient = svgEl(
      'linearGradient',
      { id: 'ng', gradientUnits: 'userSpaceOnUse', x1: x, y1: 0, x2: x + w, y2: 0 },
      defs,
    )
    svgEl('stop', { offset: '0', style: 'stop-color:var(--blue)' }, gradient)
    svgEl('stop', { offset: '.55', style: 'stop-color:var(--violet)' }, gradient)
    svgEl('stop', { offset: '1', style: 'stop-color:var(--accent)' }, gradient)
    const blur = svgEl(
      'filter',
      { id: 'mblur', x: '-50%', y: '-50%', width: '200%', height: '200%' },
      defs,
    )
    svgEl('feGaussianBlur', { stdDeviation: '9' }, blur)
    const area = {
      maskUnits: 'userSpaceOnUse',
      x: x - 50,
      y: y - 200,
      width: w + 100,
      height: h + 400,
    }
    this.litMask = svgEl('mask', { id: 'mlit', ...area }, defs)
    this.flashMask = svgEl('mask', { id: 'mflash', ...area }, defs)
    const text = svgEl(
      'text',
      {
        id: 'nm',
        x: 0,
        y: FONT_SIZE,
        'font-family': FONT_FAMILY,
        'font-weight': '700',
        'font-size': FONT_SIZE,
      },
      defs,
    )
    text.textContent = this.name

    svgEl('use', { href: '#nm', class: 'n-cu' }, this.svg)
    svgEl('use', { href: '#nm', class: 'n-txt', mask: 'url(#mlit)' }, this.svg)
    svgEl('use', { href: '#nm', class: 'n-spark', mask: 'url(#mflash)' }, this.svg)

    const measure = (i: number) => ctx.measureText(this.name.slice(0, i)).width
    const t = ctx.measureText('t')
    const xHeight = ctx.measureText('x').actualBoundingBoxAscent
    const first = this.name.indexOf('tt')
    this.tt = {
      c1: measure(first) + t.width * 0.42,
      c2: measure(first + 1) + t.width * 0.42,
      top: FONT_SIZE - t.actualBoundingBoxAscent,
      bar: FONT_SIZE - xHeight + xHeight * 0.06,
      left: measure(first),
      right: measure(first + 2),
    }
    this.trace = this.buildTrace()
  }

  private buildTrace(): Trace {
    const { c1, c2, bar } = this.tt
    const base = FONT_SIZE
    const y = base + 58
    const d = `M${c1 - 230} ${y}H${c1 - 58}L${c1} ${base}V${bar}H${c2}V${base}L${c2 + 58} ${y}H${c2 + 330}`
    const below = svgEl('g')
    this.svg.insertBefore(below, this.svg.querySelector('use'))
    svgEl('path', { d, class: 'tt-trace' }, below)
    for (const cx of [c1 - 230, c2 + 330])
      svgEl('circle', { cx, cy: y, r: 4.4, class: 'tt-via' }, below)

    const layer = svgEl('g', {}, this.svg)
    const path = svgEl('path', { d, fill: 'none', stroke: 'none' }, layer)
    const length = path.getTotalLength()
    const beforeFirst = c1 - 58 - (c1 - 230) + Math.hypot(58, 58)
    return {
      path,
      layer,
      length,
      at1: beforeFirst / length,
      at2: (beforeFirst + (base - bar) + (c2 - c1)) / length,
    }
  }

  private crackle(cx: number) {
    if (this.destroyed) return
    const { top, bar } = this.tt
    const cy = bar
    const glow = svgEl(
      'circle',
      { cx, cy: (top + FONT_SIZE) / 2, r: 50, fill: '#fff', opacity: 0, filter: 'url(#mblur)' },
      this.flashMask,
    )
    tween(
      900,
      (_, k) =>
        glow.setAttribute(
          'opacity',
          String((k < 0.18 ? k / 0.18 : Math.pow(1 - (k - 0.18) / 0.82, 1.6)) * 0.95),
        ),
      linear,
    ).then(() => glow.remove())
    if (this.reduced) return

    const group = svgEl('g', {}, this.trace.layer)
    const ring = svgEl('circle', { cx, cy, r: 4, class: 'tt-ring' }, group)
    tween(520, (e, k) => {
      ring.setAttribute('r', String(4 + e * 38))
      ring.setAttribute('opacity', String((1 - k) * 0.9))
      ring.setAttribute('stroke-width', String(2.2 * (1 - k) + 0.3))
    })

    const bolts = [-1, 1].map((side) => ({
      side,
      paths: ['tt-bolt-glow', 'tt-bolt-core', 'tt-bolt-glow', 'tt-bolt-core'].map((className) =>
        svgEl('path', { class: className }, group),
      ),
    }))
    const drawBolts = () => {
      for (const { side, paths } of bolts) {
        const angle = -Math.PI / 2 + side * (0.55 + Math.random() * 0.55)
        const length = 26 + Math.random() * 16
        const main = boltPath(cx, cy - 2, angle, length, 6)
        const [fx, fy] = main.points[3]
        const fork = boltPath(fx, fy, angle + side * (0.5 + Math.random() * 0.4), length * 0.45, 3)
        paths[0].setAttribute('d', main.d)
        paths[1].setAttribute('d', main.d)
        paths[2].setAttribute('d', fork.d)
        paths[3].setAttribute('d', fork.d)
      }
    }
    drawBolts()
    let frame = 0
    const flicker = window.setInterval(() => {
      frame++
      drawBolts()
      group.style.opacity = String(Math.max(0, 1 - frame / 9) * (0.75 + Math.random() * 0.25))
      if (frame >= 9) {
        clearInterval(flicker)
        for (const { paths } of bolts) for (const p of paths) p.remove()
      }
    }, 38)

    for (let i = 0; i < 9; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
      const speed = 55 + Math.random() * 75
      const life = 520 + Math.random() * 380
      const spark = svgEl('path', { class: 'tt-spark' }, group)
      let px = cx
      let py = cy
      tween(
        life,
        (_, k) => {
          const t = (k * life) / 1000
          const sx = cx + Math.cos(angle) * speed * t
          const sy = cy + Math.sin(angle) * speed * t + 160 * t * t
          spark.setAttribute(
            'd',
            `M${px.toFixed(1)} ${py.toFixed(1)}L${sx.toFixed(1)} ${sy.toFixed(1)}`,
          )
          spark.setAttribute('opacity', (1 - k).toFixed(2))
          px += (sx - px) * 0.55
          py += (sy - py) * 0.55
        },
        linear,
      )
    }
    this.later(() => group.remove(), 1000)
  }

  private later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      this.timers.delete(id)
      if (!this.destroyed) fn()
    }, ms)
    this.timers.add(id)
  }
}

function boltPath(x0: number, y0: number, angle: number, length: number, segments: number) {
  let x = x0
  let y = y0
  let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`
  const points: [number, number][] = [[x, y]]
  for (let i = 1; i <= segments; i++) {
    const k = i / segments
    const a = angle + (Math.random() - 0.5) * 0.8
    const step = length / segments
    x += Math.cos(a) * step
    y += Math.sin(a) * step
    const jx = x + (Math.random() - 0.5) * length * 0.1 * (1 - k)
    const jy = y + (Math.random() - 0.5) * length * 0.1 * (1 - k)
    d += `L${jx.toFixed(1)} ${jy.toFixed(1)}`
    points.push([jx, jy])
  }
  return { d, points }
}
