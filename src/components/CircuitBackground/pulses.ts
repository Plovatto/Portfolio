import { HUE, PULSE } from './config'
import type { Palette } from './config'
import { hsla, randomIn } from './math'
import type { GlowSprites } from './sprites'
import type { Graph } from './types'

interface Pulse {
  from: number
  to: number
  along: number
  len: number
  speed: number
  hue: number
  hist: number[]
  born: number
  life: number
  fade: number
  dying: boolean
  stopped: boolean
}

export class PulseSystem {
  private list: Pulse[] = []
  private graph: Graph | null = null

  get count(): number {
    return this.list.length
  }

  reset(graph: Graph) {
    this.graph = graph
    this.list = []
  }

  spawn(node: number, now: number, speedScale = 1, hue?: number) {
    const g = this.graph
    if (!g || node < 0 || this.list.length >= PULSE.maxTotal) return
    const neighbors = g.adj[node]
    if (!neighbors?.length) return
    const to = neighbors[Math.floor(Math.random() * neighbors.length)]
    this.list.push({
      from: node,
      to,
      along: 0,
      len: Math.hypot(g.nodeX[to] - g.nodeX[node], g.nodeY[to] - g.nodeY[node]),
      speed: randomIn(...PULSE.speed) * speedScale,
      hue: hue ?? randomIn(HUE.from, HUE.to),
      hist: [node],
      born: now,
      life: randomIn(...PULSE.life),
      fade: 0,
      dying: false,
      stopped: false,
    })
  }

  update(dt: number, now: number, top: number, bottom: number) {
    const g = this.graph
    if (!g) return
    for (const p of this.list) {
      if (!p.dying && now - p.born > p.life) p.dying = true
      p.fade = p.dying ? p.fade - dt * 2 : Math.min(1, p.fade + dt * 3)
      if (!p.stopped) this.advance(p, p.speed * dt)
    }
    this.list = this.list.filter((p) => {
      const y = g.nodeY[p.to]
      return p.fade > 0 && y > top - 400 && y < bottom + 400
    })
  }

  draw(ctx: CanvasRenderingContext2D, palette: Palette, sprites: GlowSprites) {
    const g = this.graph
    if (!g) return
    const { nodeX, nodeY } = g
    const { signalSat: sat, signalLight: light } = palette
    ctx.lineWidth = 1.6

    for (const p of this.list) {
      const t = p.len ? p.along / p.len : 0
      const hx = nodeX[p.from] + (nodeX[p.to] - nodeX[p.from]) * t
      const hy = nodeY[p.from] + (nodeY[p.to] - nodeY[p.from]) * t
      const alpha = Math.max(0, p.fade)
      const h0 = p.hist[0]
      const h1 = p.hist.length >= PULSE.trail && !p.stopped ? p.hist[1] : h0
      const tx = nodeX[h0] + (nodeX[h1] - nodeX[h0]) * t
      const ty = nodeY[h0] + (nodeY[h1] - nodeY[h0]) * t

      const grad = ctx.createLinearGradient(tx, ty, hx, hy)
      grad.addColorStop(0, hsla(p.hue, sat, light, 0))
      grad.addColorStop(0.7, hsla(p.hue, sat, light, 0.55 * alpha))
      grad.addColorStop(1, hsla(p.hue, sat, light + 10, alpha))
      ctx.strokeStyle = grad
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      for (let i = h1 === h0 ? 1 : 2; i < p.hist.length; i++) {
        ctx.lineTo(nodeX[p.hist[i]], nodeY[p.hist[i]])
      }
      ctx.lineTo(hx, hy)
      ctx.stroke()

      sprites.draw(ctx, p.hue, light, hx, hy, 12, alpha * palette.glowAlpha)
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.85 * alpha).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(hx, hy, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private advance(p: Pulse, distance: number) {
    const g = this.graph!
    p.along += distance
    while (p.along >= p.len) {
      p.along -= p.len
      p.hist.push(p.to)
      if (p.hist.length > PULSE.trail) p.hist.shift()
      const next = this.choose(p.from, p.to)
      p.from = p.to
      if (next < 0) {
        p.stopped = true
        p.dying = true
        p.along = 0
        p.len = 0
        return
      }
      p.to = next
      p.len = Math.hypot(g.nodeX[next] - g.nodeX[p.from], g.nodeY[next] - g.nodeY[p.from])
    }
  }

  private choose(from: number, at: number): number {
    const { nodeX, nodeY, adj } = this.graph!
    const options = adj[at].filter((n) => n !== from)
    if (!options.length) return -1
    if (options.length === 1) return options[0]
    const dx = Math.sign(nodeX[at] - nodeX[from])
    const dy = Math.sign(nodeY[at] - nodeY[from])
    const weights = options.map((n) =>
      Math.sign(nodeX[n] - nodeX[at]) === dx && Math.sign(nodeY[n] - nodeY[at]) === dy ? 4 : 1,
    )
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0)
    for (let i = 0; i < options.length; i++) {
      roll -= weights[i]
      if (roll <= 0) return options[i]
    }
    return options[options.length - 1]
  }
}
