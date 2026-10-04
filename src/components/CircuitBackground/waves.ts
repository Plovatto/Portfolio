import { HUE } from './config'
import type { Palette } from './config'
import { hsla, lowerBound } from './math'
import type { GlowSprites } from './sprites'
import type { Graph } from './types'

export interface WaveEdges {
  ax: Float32Array
  ay: Float32Array
  bx: Float32Array
  by: Float32Array
  d: Float32Array
  count: number
  maxD: number
  tipX: Float32Array
  tipY: Float32Array
  tipD: Float32Array
  tipCount: number
}

export interface Wave {
  edges: WaveEdges
  start: number
  speed: number
  trail: number
  inward: boolean
}

const BUCKETS = 8

function dijkstra(graph: Graph, sources: number[], maxD: number) {
  const { nodeX, nodeY, adj } = graph
  const dist = new Float64Array(nodeX.length).fill(Infinity)
  const visited: number[] = []
  const heapD: number[] = []
  const heapN: number[] = []

  const push = (d: number, n: number) => {
    heapD.push(d)
    heapN.push(n)
    let i = heapD.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heapD[p] <= heapD[i]) break
      ;[heapD[p], heapD[i]] = [heapD[i], heapD[p]]
      ;[heapN[p], heapN[i]] = [heapN[i], heapN[p]]
      i = p
    }
  }
  const pop = (): [number, number] => {
    const top: [number, number] = [heapD[0], heapN[0]]
    const lastD = heapD.pop()!
    const lastN = heapN.pop()!
    if (heapD.length) {
      heapD[0] = lastD
      heapN[0] = lastN
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < heapD.length && heapD[l] < heapD[m]) m = l
        if (r < heapD.length && heapD[r] < heapD[m]) m = r
        if (m === i) break
        ;[heapD[m], heapD[i]] = [heapD[i], heapD[m]]
        ;[heapN[m], heapN[i]] = [heapN[i], heapN[m]]
        i = m
      }
    }
    return top
  }

  for (const s of sources) {
    if (s < 0 || dist[s] === 0) continue
    dist[s] = 0
    push(0, s)
  }
  while (heapD.length) {
    const [d, u] = pop()
    if (d > dist[u]) continue
    visited.push(u)
    for (const v of adj[u]) {
      const nd = d + Math.hypot(nodeX[v] - nodeX[u], nodeY[v] - nodeY[u])
      if (nd < dist[v] && nd <= maxD) {
        dist[v] = nd
        push(nd, v)
      }
    }
  }
  return { dist, visited }
}

function pack(edges: number[], tips: number[]): WaveEdges {
  const count = edges.length / 5
  const order = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => edges[a * 5 + 4] - edges[b * 5 + 4],
  )
  const ax = new Float32Array(count)
  const ay = new Float32Array(count)
  const bx = new Float32Array(count)
  const by = new Float32Array(count)
  const d = new Float32Array(count)
  order.forEach((src, i) => {
    ax[i] = edges[src * 5]
    ay[i] = edges[src * 5 + 1]
    bx[i] = edges[src * 5 + 2]
    by[i] = edges[src * 5 + 3]
    d[i] = edges[src * 5 + 4]
  })

  const tipCount = tips.length / 3
  const tipOrder = Array.from({ length: tipCount }, (_, i) => i).sort(
    (a, b) => tips[a * 3 + 2] - tips[b * 3 + 2],
  )
  const tipX = new Float32Array(tipCount)
  const tipY = new Float32Array(tipCount)
  const tipD = new Float32Array(tipCount)
  tipOrder.forEach((src, i) => {
    tipX[i] = tips[src * 3]
    tipY[i] = tips[src * 3 + 1]
    tipD[i] = tips[src * 3 + 2]
  })

  return { ax, ay, bx, by, d, count, maxD: count ? d[count - 1] : 0, tipX, tipY, tipD, tipCount }
}

export function graphWave(graph: Graph, sources: number[], maxD: number): WaveEdges | null {
  if (!sources.length) return null
  const { nodeX, nodeY, adj } = graph
  const { dist, visited } = dijkstra(graph, sources, maxD)
  const edges: number[] = []
  const tips: number[] = []
  for (const u of visited) {
    for (const v of adj[u]) {
      if (u < v && dist[v] !== Infinity) {
        edges.push(nodeX[u], nodeY[u], nodeX[v], nodeY[v], Math.min(dist[u], dist[v]))
      }
    }
    if (adj[u].length === 1 && dist[u] > 0) tips.push(nodeX[u], nodeY[u], dist[u])
  }
  return edges.length ? pack(edges, tips) : null
}

export function radialWave(graph: Graph, cx: number, cy: number): WaveEdges | null {
  const { nodeX, nodeY, adj } = graph
  const edges: number[] = []
  for (let u = 0; u < adj.length; u++) {
    for (const v of adj[u]) {
      if (u >= v) continue
      const mx = (nodeX[u] + nodeX[v]) / 2
      const my = (nodeY[u] + nodeY[v]) / 2
      edges.push(nodeX[u], nodeY[u], nodeX[v], nodeY[v], Math.hypot(mx - cx, my - cy))
    }
  }
  return edges.length ? pack(edges, []) : null
}

export function waveFront(wave: Wave, now: number): number {
  const traveled = (Math.max(0, now - wave.start) / 1000) * wave.speed
  return wave.inward ? wave.edges.maxD - traveled : traveled
}

export function waveDone(wave: Wave, now: number): boolean {
  const front = waveFront(wave, now)
  return wave.inward ? front + wave.trail < 0 : front - wave.trail > wave.edges.maxD
}

export function drawWaveEdges(
  ctx: CanvasRenderingContext2D,
  e: WaveEdges,
  front: number,
  trail: number,
  inward: boolean,
  palette: Palette,
  sprites: GlowSprites,
) {
  const lo = inward ? front : front - trail
  const hi = inward ? front + trail : front
  const strength = (d: number) => (inward ? 1 - (d - front) / trail : 1 - (front - d) / trail)
  const paths: Path2D[] = []
  for (let b = 0; b < BUCKETS; b++) paths.push(new Path2D())

  let any = false
  for (let i = lowerBound(e.d, e.count, lo); i < e.count && e.d[i] <= hi; i++) {
    const bucket = Math.min(BUCKETS - 1, Math.floor((1 - strength(e.d[i])) * BUCKETS))
    paths[bucket].moveTo(e.ax[i], e.ay[i])
    paths[bucket].lineTo(e.bx[i], e.by[i])
    any = true
  }
  if (!any) return

  const { signalSat: sat, signalLight: light } = palette
  for (let b = 0; b < BUCKETS; b++) {
    const t = b / (BUCKETS - 1)
    ctx.strokeStyle = hsla(
      HUE.from + (HUE.to - HUE.from) * t,
      sat,
      light + (b === 0 ? 14 : 0),
      (1 - b / BUCKETS) * 0.95,
    )
    ctx.lineWidth = 2.4 - b * 0.18
    ctx.stroke(paths[b])
  }

  for (let i = lowerBound(e.tipD, e.tipCount, lo); i < e.tipCount && e.tipD[i] <= hi; i++) {
    sprites.draw(
      ctx,
      HUE.from,
      light,
      e.tipX[i],
      e.tipY[i],
      14,
      strength(e.tipD[i]) * palette.glowAlpha,
    )
  }
}
