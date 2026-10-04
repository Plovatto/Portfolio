import type { Trace, Via } from './types'

const EMPTY = 0
export const KEEPOUT = -1
export const RESERVED = -2

export const DX = [1, 1, 0, -1, -1, -1, 0, 1]
export const DY = [0, 1, 1, 1, 0, -1, -1, -1]

export function dirOf(dx: number, dy: number): number {
  const sx = Math.sign(dx)
  const sy = Math.sign(dy)
  for (let d = 0; d < 8; d++) if (DX[d] === sx && DY[d] === sy) return d
  return -1
}

interface WalkOptions {
  net: number
  budget: number
  minRun: number
  turnChance: number
  joinChance: number
  branchChance: number
  keepoutSteps: number
  width: number
}

interface StraightRun {
  x: number
  y: number
  dir: number
  length: number
}

interface RouteEnd {
  x: number
  y: number
  node: number
  complete: boolean
  steps: number
  trace: Trace | null
}

export class Router {
  readonly cols: number
  readonly rows: number
  readonly cell: number
  readonly occ: Int32Array
  readonly nodeOf: Int32Array
  readonly nodeX: number[] = []
  readonly nodeY: number[] = []
  readonly adj: number[][] = []
  readonly traces: Trace[] = []
  readonly vias: Via[] = []
  readonly runs: StraightRun[] = []
  traceCells = 0
  private nextNet = 1

  constructor(cols: number, rows: number, cell: number) {
    this.cols = cols
    this.rows = rows
    this.cell = cell
    this.occ = new Int32Array(cols * rows)
    this.nodeOf = new Int32Array(cols * rows).fill(-1)
  }

  newNet(): number {
    return this.nextNet++
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows
  }

  at(x: number, y: number): number {
    return this.inBounds(x, y) ? this.occ[y * this.cols + x] : RESERVED
  }

  nodeAt(x: number, y: number): number {
    return this.inBounds(x, y) ? this.nodeOf[y * this.cols + x] : -1
  }

  fill(x0: number, y0: number, x1: number, y1: number, value: number, onlyEmpty = false) {
    for (let y = Math.max(0, y0); y <= Math.min(this.rows - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(this.cols - 1, x1); x++) {
        const i = y * this.cols + x
        if (onlyEmpty && this.occ[i] !== EMPTY) continue
        this.occ[i] = value
      }
    }
  }

  isFree(x0: number, y0: number, x1: number, y1: number): boolean {
    if (!this.inBounds(x0, y0) || !this.inBounds(x1, y1)) return false
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (this.occ[y * this.cols + x] !== EMPTY) return false
      }
    }
    return true
  }

  countEmpty(): number {
    let count = 0
    for (let i = 0; i < this.occ.length; i++) if (this.occ[i] === EMPTY) count++
    return count
  }

  canEnter(x: number, y: number, net: number, allowKeepout: boolean): boolean {
    if (!this.enterable(x, y, allowKeepout)) return false
    for (let d = 0; d < 8; d++) {
      if (this.isOtherNet(x + DX[d], y + DY[d], net)) return false
    }
    return true
  }

  occupy(x: number, y: number, net: number): number {
    const i = y * this.cols + x
    if (this.occ[i] <= 0) {
      this.occ[i] = net
      this.traceCells++
    }
    let node = this.nodeOf[i]
    if (node < 0) {
      node = this.nodeX.length
      this.nodeX.push(x * this.cell)
      this.nodeY.push(y * this.cell)
      this.adj.push([])
      this.nodeOf[i] = node
    }
    return node
  }

  link(a: number, b: number) {
    if (a === b || a < 0 || b < 0 || this.adj[a].includes(b)) return
    this.adj[a].push(b)
    this.adj[b].push(a)
  }

  lay(corners: number[], net: number, width: number, startNode?: number): RouteEnd {
    let x = corners[0]
    let y = corners[1]
    let node = startNode ?? this.occupy(x, y, net)
    const points = [x * this.cell, y * this.cell]
    let dir = -1
    let steps = 0
    let complete = true

    outer: for (let k = 2; k < corners.length; k += 2) {
      const dx = corners[k] - x
      const dy = corners[k + 1] - y
      if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) {
        complete = false
        break
      }
      const d = dirOf(dx, dy)
      if (d < 0) continue
      if (dir !== -1 && d !== dir) points.push(x * this.cell, y * this.cell)
      dir = d
      while (x !== corners[k] || y !== corners[k + 1]) {
        const nx = x + DX[d]
        const ny = y + DY[d]
        if (!this.canEnter(nx, ny, net, true)) {
          complete = false
          break outer
        }
        const next = this.occupy(nx, ny, net)
        this.link(node, next)
        node = next
        x = nx
        y = ny
        steps++
      }
    }

    points.push(x * this.cell, y * this.cell)
    const trace = steps > 0 ? { points, width } : null
    if (trace) this.traces.push(trace)
    if (!complete && steps > 0) this.vias.push({ x: x * this.cell, y: y * this.cell })
    return { x, y, node, complete, steps, trace }
  }

  walk(
    startX: number,
    startY: number,
    dir: number,
    o: WalkOptions,
    startNode?: number,
    depth = 0,
  ): RouteEnd {
    const cell = this.cell
    let x = startX
    let y = startY
    let node = startNode ?? this.occupy(x, y, o.net)
    const points = [x * cell, y * cell]
    let d = dir
    let run = 0
    let steps = 0
    let joined = false
    let runX = x
    let runY = y
    const branches: number[] = []

    for (let step = 0; step < o.budget && !joined; step++) {
      const canTurn = run >= o.minRun
      const s = Math.random() < 0.5 ? 1 : 7
      const left = (d + s) % 8
      const right = (d + 8 - s) % 8
      const candidates = canTurn
        ? Math.random() < o.turnChance
          ? [left, d, right]
          : [d, left, right]
        : [d]
      const allowKeepout = step < o.keepoutSteps
      let moved = false

      for (const c of candidates) {
        const nx = x + DX[c]
        const ny = y + DY[c]
        if (!this.inBounds(nx, ny)) continue
        const fx = nx + DX[c]
        const fy = ny + DY[c]
        const direct = this.isOtherNet(nx, ny, o.net)
        const enter = !direct && this.canEnter(nx, ny, o.net, allowKeepout)
        const reach =
          !direct &&
          !enter &&
          this.enterable(nx, ny, allowKeepout) &&
          this.isOtherNet(fx, fy, o.net)
        if (!enter && !((direct || reach) && Math.random() < o.joinChance)) continue

        if (c !== d) {
          points.push(x * cell, y * cell)
          this.recordRun(runX, runY, x, y, d)
          runX = x
          runY = y
          d = c
          run = 0
        }
        if (!direct) {
          const next = this.occupy(nx, ny, o.net)
          this.link(node, next)
          node = next
          x = nx
          y = ny
          run++
          steps++
        }
        if (direct || reach) {
          const tx = direct ? nx : fx
          const ty = direct ? ny : fy
          this.link(node, this.nodeAt(tx, ty))
          points.push(tx * cell, ty * cell)
          joined = true
        } else if (depth === 0 && run > o.minRun && d % 2 === 0 && Math.random() < o.branchChance) {
          branches.push(x, y, (d + (Math.random() < 0.5 ? 2 : 6)) % 8)
        }
        moved = true
        break
      }
      if (!moved) break
    }

    if (!joined) points.push(x * cell, y * cell)
    this.recordRun(runX, runY, x, y, d)
    const trace = steps > 0 || joined ? { points, width: o.width } : null
    if (trace) this.traces.push(trace)
    if (!joined && steps > 0) this.vias.push({ x: x * cell, y: y * cell })

    for (let i = 0; i < branches.length; i += 3) {
      const bx = branches[i]
      const by = branches[i + 1]
      this.walk(
        bx,
        by,
        branches[i + 2],
        { ...o, budget: Math.ceil(o.budget * 0.5) },
        this.nodeAt(bx, by),
        depth + 1,
      )
    }

    return { x, y, node, complete: true, steps, trace }
  }

  private enterable(x: number, y: number, allowKeepout: boolean): boolean {
    const v = this.at(x, y)
    return v === EMPTY || (allowKeepout && v === KEEPOUT)
  }

  private isOtherNet(x: number, y: number, net: number): boolean {
    const v = this.at(x, y)
    return v > 0 && v !== net
  }

  private recordRun(x0: number, y0: number, x1: number, y1: number, dir: number) {
    if (dir % 2 !== 0) return
    const length = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
    if (length >= 6) this.runs.push({ x: x0, y: y0, dir, length })
  }
}
