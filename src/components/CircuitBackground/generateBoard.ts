import { BOARD, INNER, SPINE } from './config'
import { pick, randInt, shuffle } from './math'
import { DX, DY, KEEPOUT, RESERVED, Router, dirOf } from './router'
import type {
  BoardChip,
  BoardData,
  ChipPin,
  ChipSpec,
  Label,
  LayerData,
  Pad,
  Part,
  Rect,
  Side,
  SpineLine,
} from './types'

const SIDE_U: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]
const SIDE_V: [number, number][] = [
  [0, 1],
  [0, 1],
  [1, 0],
  [1, 0],
]
const SIDES_FOR: Record<ChipSpec['pins'], Side[]> = {
  lr: [0, 1],
  tb: [2, 3],
  all: [0, 1, 2, 3],
  none: [],
}

interface Footprint {
  c0: number
  c1: number
  r0: number
  r1: number
}

interface Slot {
  x: number
  y: number
  used: boolean
  pin: ChipPin
}

interface ChipWork {
  spec: ChipSpec
  fp: Footprint
  slots: Slot[][]
  tap: number[] | null
  tapY: number | null
}

interface BoardInput {
  width: number
  height: number
  cell: number
  chips: ChipSpec[]
  quiets: Rect[]
  label: string
  spine: boolean
}

function footprint(r: Rect, cell: number): Footprint {
  return {
    c0: Math.floor(r.left / cell),
    c1: Math.ceil(r.right / cell),
    r0: Math.floor(r.top / cell),
    r1: Math.ceil(r.bottom / cell),
  }
}

function slotsFor(router: Router, fp: Footprint, side: Side, spec: ChipSpec): Slot[] {
  const { cell } = router
  const { pinSpacing: spacing, pinInset: inset } = BOARD
  const vertical = side < 2
  const from = vertical ? fp.r0 : fp.c0
  const span = (vertical ? fp.r1 : fp.c1) - from - inset * 2
  if (span < 0) return []
  const count = Math.floor(span / spacing) + 1
  const start = from + inset + Math.floor((span - (count - 1) * spacing) / 2)
  const slots: Slot[] = []

  for (let i = 0; i < count; i++) {
    const along = start + i * spacing
    const x = vertical ? (side === 0 ? fp.c0 - 1 : fp.c1 + 1) : along
    const y = vertical ? along : side === 2 ? fp.r0 - 1 : fp.r1 + 1
    if (!router.inBounds(x, y)) continue
    const ex = vertical ? (side === 0 ? spec.left : spec.right) : x * cell
    const ey = vertical ? y * cell : side === 2 ? spec.top : spec.bottom
    slots.push({ x, y, used: false, pin: { x: x * cell, y: y * cell, ex, ey, side, node: -1 } })
  }
  return slots
}

function routeBus(router: Router, group: Slot[], side: Side, width: number) {
  const [ux, uy] = SIDE_U[side]
  const [vx, vy] = SIDE_V[side]
  const n = group.length
  const turn = pick([0, 1, -1, 1, -1])
  const out = randInt(2, 4)
  const jog = randInt(2, 5)
  const tail = randInt(2, 5)
  const budget = randInt(6, 40)

  group.forEach((slot, j) => {
    const stagger = turn > 0 ? n - 1 - j : turn < 0 ? j : 0
    let cx = slot.x + ux * (out + stagger)
    let cy = slot.y + uy * (out + stagger)
    const corners = [slot.x, slot.y, cx, cy]
    if (turn !== 0) {
      cx += (ux + turn * vx) * jog
      cy += (uy + turn * vy) * jog
      corners.push(cx, cy)
    }
    const back = tail + (turn !== 0 ? n - 1 - stagger : 0)
    corners.push(cx + ux * back, cy + uy * back)

    const net = router.newNet()
    if (!router.canEnter(slot.x, slot.y, net, true)) return
    const pinNode = router.occupy(slot.x, slot.y, net)
    slot.pin.node = pinNode
    slot.used = true
    const end = router.lay(corners, net, width, pinNode)
    if (!end.complete) return
    router.walk(
      end.x,
      end.y,
      dirOf(ux, uy),
      {
        net,
        budget,
        minRun: 3,
        turnChance: 0.14,
        joinChance: 0.7,
        branchChance: 0.03,
        keepoutSteps: 0,
        width,
      },
      end.node,
    )
  })
}

function routeSide(
  router: Router,
  slots: Slot[],
  side: Side,
  width: number,
  skipChance: number,
  maxGroup: number,
) {
  let i = 0
  while (i < slots.length) {
    if (slots[i].used || Math.random() < skipChance) {
      i++
      continue
    }
    const size = randInt(1, maxGroup)
    const group: Slot[] = []
    while (group.length < size && i < slots.length && !slots[i].used) group.push(slots[i++])
    routeBus(router, group, side, width)
    if (Math.random() < 0.4) i++
  }
}

function buildSpine(router: Router, chips: ChipWork[], quiets: Footprint[]): SpineLine[] | null {
  const hero = chips.find((c) => c.spec.hero)
  if (!hero || hero.slots[0].length < 3) return null

  const lefts = [...chips.map((c) => c.fp.c0), ...quiets.map((q) => q.c0 - 1)]
  const inner = Math.min(...lefts) - SPINE.gap
  const lineCount = 3
  if (inner - SPINE.spacing * (lineCount - 1) < 3) return null

  const { cell } = router
  const left = hero.slots[0]
  const mid = Math.floor(left.length / 2)
  const chosen = left.slice(mid - 1, mid + 2)
  const net = router.newNet()
  const bottom = Math.min(router.rows - 3, Math.max(...chips.map((c) => c.fp.r1)) + 10)
  const k = SPINE.chamfer
  const lines: SpineLine[] = []

  chosen.forEach((slot, i) => {
    const col = inner - SPINE.spacing * (chosen.length - 1 - i)
    const pinNode = router.occupy(slot.x, slot.y, net)
    slot.pin.node = pinNode
    slot.used = true
    const end = router.lay(
      [slot.x, slot.y, col + k, slot.y, col, slot.y + k, col, bottom],
      net,
      SPINE.width,
      pinNode,
    )
    if (end.trace) {
      lines.push({
        points: end.trace.points,
        x: col * cell,
        top: (slot.y + k) * cell,
        bottom: end.y * cell,
      })
    }
  })
  if (!lines.length) return null

  const firstTapRow = chosen[chosen.length - 1].y + k + 2
  for (const chip of chips) {
    if (chip === hero || !chip.slots[0].length) continue
    const centerRow = (chip.fp.r0 + chip.fp.r1) / 2
    const slot = chip.slots[0].reduce((best, s) =>
      Math.abs(s.y - centerRow) < Math.abs(best.y - centerRow) ? s : best,
    )
    if (slot.y < firstTapRow || slot.y >= bottom) continue
    const start = router.nodeAt(inner, slot.y)
    if (start < 0) continue
    const end = router.lay([inner, slot.y, slot.x, slot.y], net, SPINE.width, start)
    if (!end.complete || !end.trace) continue
    slot.used = true
    slot.pin.node = end.node
    chip.tap = end.trace.points
    chip.tapY = slot.y * cell
  }

  return lines
}

function placeICs(
  router: Router,
  count: number,
  parts: Part[],
  pads: Pad[],
  labels: Label[],
  width: number,
) {
  const { cell, cols, rows } = router
  let placed = 0
  let ref = 10

  for (let attempt = 0; attempt < count * 10 && placed < count; attempt++) {
    const pinCount = randInt(3, 6)
    const long = pinCount * 2
    const short = randInt(3, 5)
    const vertical = Math.random() < 0.6
    const w = vertical ? short : long
    const h = vertical ? long : short
    const x0 = randInt(5, cols - w - 6)
    const y0 = randInt(5, rows - h - 6)
    if (!router.isFree(x0 - 4, y0 - 4, x0 + w + 4, y0 + h + 4)) continue

    router.fill(x0, y0, x0 + w, y0 + h, RESERVED)
    router.fill(x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, KEEPOUT, true)
    parts.push({ x: x0 * cell + 2, y: y0 * cell + 2, w: w * cell - 4, h: h * cell - 4, pin1: true })
    labels.push({ x: x0 * cell + 2, y: y0 * cell - 5, text: `U${ref++}`, align: 'left', size: 9 })

    const sides: Side[] = vertical ? [0, 1] : [2, 3]
    for (let p = 0; p < pinCount; p++) {
      const along = 1 + p * 2
      for (const side of sides) {
        const px = side === 0 ? x0 - 1 : side === 1 ? x0 + w + 1 : x0 + along
        const py = side === 2 ? y0 - 1 : side === 3 ? y0 + h + 1 : y0 + along
        if (side === 0) pads.push({ x: px * cell, y: py * cell - 2, w: cell + 2, h: 4 })
        if (side === 1) pads.push({ x: (x0 + w) * cell - 2, y: py * cell - 2, w: cell + 2, h: 4 })
        if (side === 2) pads.push({ x: px * cell - 2, y: py * cell, w: 4, h: cell + 2 })
        if (side === 3) pads.push({ x: px * cell - 2, y: (y0 + h) * cell - 2, w: 4, h: cell + 2 })
        if (Math.random() < 0.25) continue

        const net = router.newNet()
        if (!router.canEnter(px, py, net, true)) continue
        const [ux, uy] = SIDE_U[side]
        router.walk(px, py, dirOf(ux, uy), {
          net,
          budget: randInt(4, 28),
          minRun: 2,
          turnChance: 0.2,
          joinChance: 0.65,
          branchChance: 0.02,
          keepoutSteps: 2,
          width,
        })
      }
    }
    placed++
  }
}

function fillNetwork(router: Router, density: number, width: number) {
  const goal = router.traceCells + router.countEmpty() * density
  const maxTries = (router.cols * router.rows) / 6
  let tries = 0

  while (router.traceCells < goal && tries++ < maxTries) {
    const x = randInt(2, router.cols - 3)
    const y = randInt(2, router.rows - 3)
    const net = router.newNet()
    if (!router.canEnter(x, y, net, false)) continue
    const dir = Math.random() < 0.7 ? randInt(0, 3) * 2 : randInt(0, 3) * 2 + 1
    const end = router.walk(x, y, dir, {
      net,
      budget: randInt(8, 64),
      minRun: randInt(2, 5),
      turnChance: 0.12,
      joinChance: 0.55,
      branchChance: 0.04,
      keepoutSteps: 0,
      width,
    })
    if (end.steps > 1) router.vias.push({ x: x * router.cell, y: y * router.cell })
  }
}

function placePassives(router: Router, parts: Part[], pads: Pad[], labels: Label[]) {
  const { cell } = router
  const runs = shuffle(router.runs).slice(0, Math.min(48, Math.floor(router.runs.length * 0.18)))
  let resistors = 1
  let capacitors = 1

  for (const run of runs) {
    const mid = Math.floor(run.length / 2)
    const cx = run.x + DX[run.dir] * mid
    const cy = run.y + DY[run.dir] * mid
    const net = router.at(cx, cy)
    const horizontal = run.dir === 0 || run.dir === 4
    let clear = true
    for (let a = -1; a <= 1 && clear; a++) {
      for (const p of [-2, -1, 1, 2]) {
        const v = horizontal ? router.at(cx + a, cy + p) : router.at(cx + p, cy + a)
        if (v > 0 && v !== net) clear = false
      }
    }
    if (!clear) continue

    const X = cx * cell
    const Y = cy * cell
    const L = cell * 1.9
    const T = cell * 0.85
    if (horizontal) {
      parts.push({ x: X - L / 2, y: Y - T / 2, w: L, h: T, pin1: false })
      pads.push({ x: X - L / 2 - 2, y: Y - T / 2 - 1, w: 5, h: T + 2 })
      pads.push({ x: X + L / 2 - 3, y: Y - T / 2 - 1, w: 5, h: T + 2 })
    } else {
      parts.push({ x: X - T / 2, y: Y - L / 2, w: T, h: L, pin1: false })
      pads.push({ x: X - T / 2 - 1, y: Y - L / 2 - 2, w: T + 2, h: 5 })
      pads.push({ x: X - T / 2 - 1, y: Y + L / 2 - 3, w: T + 2, h: 5 })
    }
    if (Math.random() < 0.5) {
      const text = Math.random() < 0.6 ? `R${resistors++}` : `C${capacitors++}`
      labels.push(
        horizontal
          ? { x: X, y: Y - T, text, align: 'center', size: 8 }
          : { x: X + T, y: Y + 3, text, align: 'left', size: 8 },
      )
    }
  }
}

export function generateBoard(input: BoardInput): BoardData {
  const { width, height, cell } = input
  const router = new Router(Math.ceil(width / cell) + 1, Math.ceil(height / cell) + 1, cell)
  const parts: Part[] = []
  const pads: Pad[] = []
  const labels: Label[] = []
  const traceWidth = BOARD.traceWidth

  const quiets = input.quiets.map((q) => footprint(q, cell))
  for (const q of quiets) {
    router.fill(q.c0 - 1, q.r0 - 1, q.c1 + 1, q.r1 + 1, RESERVED)
    router.fill(q.c0 - 2, q.r0 - 2, q.c1 + 2, q.r1 + 2, KEEPOUT, true)
  }

  const chips: ChipWork[] = input.chips.map((spec) => {
    const fp = footprint(spec, cell)
    const k = BOARD.keepout
    router.fill(fp.c0, fp.r0, fp.c1, fp.r1, RESERVED)
    router.fill(fp.c0 - k, fp.r0 - k, fp.c1 + k, fp.r1 + k, KEEPOUT, true)
    const slots: Slot[][] = [[], [], [], []]
    for (const side of SIDES_FOR[spec.pins] ?? SIDES_FOR.lr) {
      slots[side] = slotsFor(router, fp, side, spec)
    }
    return { spec, fp, slots, tap: null, tapY: null }
  })

  const spine = input.spine ? buildSpine(router, chips, quiets) : null

  for (const chip of chips) {
    const skip = chip.spec.hero ? 0.3 : 0.55
    const maxGroup = chip.spec.hero ? 4 : 3
    for (let side = 0 as Side; side < 4; side = (side + 1) as Side) {
      routeSide(router, chip.slots[side], side, traceWidth, skip, maxGroup)
    }
  }

  placeICs(router, Math.round((width * height) / BOARD.icArea), parts, pads, labels, traceWidth)
  fillNetwork(router, BOARD.density, traceWidth)
  placePassives(router, parts, pads, labels)

  if (input.label) {
    labels.push({ x: 20, y: height - 20, text: input.label, align: 'left', size: 10 })
  }

  const boardChips: BoardChip[] = chips.map((c) => {
    const pins = c.slots
      .flat()
      .map((s) => s.pin)
      .filter((p) => p.node >= 0)
    return {
      spec: c.spec,
      pins,
      pinNodes: pins.map((p) => p.node),
      tap: c.tap,
      tapY: c.tapY,
    }
  })

  return {
    width,
    height,
    cell,
    cols: router.cols,
    rows: router.rows,
    nodeOf: router.nodeOf,
    graph: { nodeX: router.nodeX, nodeY: router.nodeY, adj: router.adj },
    traces: router.traces,
    vias: router.vias,
    parts,
    pads,
    labels,
    chips: boardChips,
    spine,
  }
}

export function generateInner(width: number, height: number): LayerData {
  const cell = INNER.cell
  const router = new Router(Math.ceil(width / cell) + 1, Math.ceil(height / cell) + 1, cell)
  fillNetwork(router, INNER.density, INNER.width)
  return { traces: router.traces, vias: router.vias }
}
