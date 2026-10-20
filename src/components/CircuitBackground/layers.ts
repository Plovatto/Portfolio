import { BOARD } from './config'
import type { Label, LayerData } from './types'

type Ink = string | CanvasGradient

export interface ChunkStyle {
  trace: Ink
  via: Ink
  pad: Ink
  part: Ink
  silk: Ink | null
  substrate: string | null
}

export interface Chunk {
  minY: number
  maxY: number
  traces: Map<number, Path2D>
  vias: Path2D
  pads: Path2D
  parts: Path2D
  marks: Path2D
  labels: Label[]
  hasParts: boolean
}

function emptyChunk(): Chunk {
  return {
    minY: Infinity,
    maxY: -Infinity,
    traces: new Map(),
    vias: new Path2D(),
    pads: new Path2D(),
    parts: new Path2D(),
    marks: new Path2D(),
    labels: [],
    hasParts: false,
  }
}

export function pathFrom(polylines: number[][]): Path2D {
  const path = new Path2D()
  for (const points of polylines) {
    path.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1])
  }
  return path
}

export function buildChunks(layer: LayerData, chunkHeight: number): Chunk[] {
  const chunks: Chunk[] = []
  const chunkAt = (y: number) => {
    const i = Math.max(0, Math.floor(y / chunkHeight))
    while (chunks.length <= i) chunks.push(emptyChunk())
    return chunks[i]
  }
  const grow = (c: Chunk, y0: number, y1: number) => {
    c.minY = Math.min(c.minY, y0)
    c.maxY = Math.max(c.maxY, y1)
  }

  for (const trace of layer.traces) {
    const { points, width } = trace
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 1; i < points.length; i += 2) {
      minY = Math.min(minY, points[i])
      maxY = Math.max(maxY, points[i])
    }
    const c = chunkAt(minY)
    let path = c.traces.get(width)
    if (!path) {
      path = new Path2D()
      c.traces.set(width, path)
    }
    path.moveTo(points[0], points[1])
    for (let i = 2; i < points.length; i += 2) path.lineTo(points[i], points[i + 1])
    grow(c, minY - width, maxY + width)
  }

  const r = BOARD.viaRadius
  for (const via of layer.vias) {
    const c = chunkAt(via.y - r)
    c.vias.moveTo(via.x + r, via.y)
    c.vias.arc(via.x, via.y, r, 0, Math.PI * 2)
    grow(c, via.y - r - 1, via.y + r + 1)
  }

  for (const pad of layer.pads ?? []) {
    const c = chunkAt(pad.y)
    c.pads.rect(pad.x, pad.y, pad.w, pad.h)
    grow(c, pad.y, pad.y + pad.h)
  }

  for (const part of layer.parts ?? []) {
    const c = chunkAt(part.y)
    c.parts.rect(part.x, part.y, part.w, part.h)
    if (part.pin1) {
      c.marks.moveTo(part.x + 6, part.y + 5)
      c.marks.arc(part.x + 5, part.y + 5, 1.4, 0, Math.PI * 2)
    }
    c.hasParts = true
    grow(c, part.y, part.y + part.h)
  }

  for (const label of layer.labels ?? []) {
    const c = chunkAt(label.y - label.size)
    c.labels.push(label)
    grow(c, label.y - label.size, label.y + 2)
  }

  return chunks
}

export function drawChunks(
  ctx: CanvasRenderingContext2D,
  chunks: Chunk[],
  top: number,
  bottom: number,
  style: ChunkStyle,
) {
  const visible = chunks.filter((c) => c.maxY >= top && c.minY <= bottom)
  if (!visible.length) return

  ctx.strokeStyle = style.trace
  for (const c of visible) {
    for (const [width, path] of c.traces) {
      ctx.lineWidth = width
      ctx.stroke(path)
    }
  }

  ctx.lineWidth = 1
  for (const c of visible) {
    if (!c.hasParts) continue
    if (style.substrate) {
      ctx.fillStyle = style.substrate
      ctx.fill(c.parts)
    }
    ctx.strokeStyle = style.part
    ctx.stroke(c.parts)
    ctx.fillStyle = style.part
    ctx.fill(c.marks)
  }

  ctx.fillStyle = style.pad
  for (const c of visible) ctx.fill(c.pads)

  ctx.strokeStyle = style.via
  ctx.lineWidth = 1.2
  for (const c of visible) ctx.stroke(c.vias)

  if (!style.silk) return
  ctx.fillStyle = style.silk
  ctx.textBaseline = 'alphabetic'
  let size = 0
  for (const c of visible) {
    for (const label of c.labels) {
      if (label.size !== size) {
        size = label.size
        ctx.font = `600 ${size}px Archivo, system-ui, sans-serif`
      }
      ctx.textAlign = label.align
      ctx.fillText(label.text, label.x, label.y)
    }
  }
}

const TILE_MARGIN = 3

export class TileLayer {
  private readonly tiles = new Map<number, HTMLCanvasElement>()
  private readonly chunks: Chunk[]
  private readonly width: number
  private readonly tileHeight: number
  private readonly scale: number
  private styleKey = ''

  constructor(chunks: Chunk[], width: number, tileHeight: number, scale: number) {
    this.chunks = chunks
    this.width = width
    this.tileHeight = tileHeight
    this.scale = scale
  }

  draw(
    ctx: CanvasRenderingContext2D,
    top: number,
    bottom: number,
    style: ChunkStyle,
    styleKey: string,
  ) {
    if (styleKey !== this.styleKey) {
      this.tiles.clear()
      this.styleKey = styleKey
    }
    const h = this.tileHeight
    const first = Math.max(0, Math.floor(top / h))
    const last = Math.floor(bottom / h)
    for (let i = first; i <= last; i++) {
      let tile = this.tiles.get(i)
      if (!tile) {
        tile = this.render(i, style)
        this.tiles.set(i, tile)
      }
      ctx.drawImage(tile, 0, i * h, this.width, h)
    }
    const ahead = [last + 1, first - 1, last + 2, first - 2].find(
      (i) => i >= 0 && i < this.chunks.length && !this.tiles.has(i),
    )
    if (ahead !== undefined) this.tiles.set(ahead, this.render(ahead, style))
    for (const key of this.tiles.keys()) {
      if (key < first - TILE_MARGIN || key > last + TILE_MARGIN) this.tiles.delete(key)
    }
  }

  private render(index: number, style: ChunkStyle): HTMLCanvasElement {
    const h = this.tileHeight
    const tile = document.createElement('canvas')
    tile.width = Math.ceil(this.width * this.scale)
    tile.height = Math.ceil(h * this.scale)
    const ctx = tile.getContext('2d')!
    ctx.scale(this.scale, this.scale)
    ctx.translate(0, -index * h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    drawChunks(ctx, this.chunks, index * h - 8, (index + 1) * h + 8, style)
    return tile
  }
}
