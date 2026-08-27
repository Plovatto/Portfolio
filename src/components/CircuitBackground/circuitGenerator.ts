export interface Point {
  x: number
  y: number
}

export interface CircuitPath {
  points: Point[]
  segmentLengths: number[]
  vertexDistances: number[]
  totalLength: number
}

export interface CircuitGrid {
  cols: number
  rows: number
  sectorCols: number
  sectorRows: number
  sectorWidth: number
  sectorHeight: number
  cellSize: number
}

interface GridOptions {
  width: number
  height: number
  cellSize?: number
  sectorSize?: number
}

const DIRECTIONS: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

function oppositeDir(dir: number): number {
  return dir % 2 === 0 ? dir + 1 : dir - 1
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function growArm(
  startX: number,
  startY: number,
  cols: number,
  rows: number,
  segments: number,
  initialDir: number,
): Point[] {
  const points: Point[] = [{ x: startX, y: startY }]
  let x = startX
  let y = startY
  let lastDir = initialDir

  for (let i = 0; i < segments; i++) {
    const candidates = shuffle([0, 1, 2, 3]).filter((dir) => dir !== oppositeDir(lastDir))
    let moved = false

    for (const dir of candidates) {
      const length = 1 + Math.floor(Math.random() * 4)
      const { x: dx, y: dy } = DIRECTIONS[dir]
      const nx = x + dx * length
      const ny = y + dy * length

      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue

      points.push({ x: nx, y: ny })
      x = nx
      y = ny
      lastDir = dir
      moved = true
      break
    }

    if (!moved) break
  }

  return points
}

function growPath(startX: number, startY: number, cols: number, rows: number): Point[] {
  const totalSegments = 4 + Math.floor(Math.random() * 6)
  const armSegments = Math.ceil(totalSegments / 2)
  const otherArmSegments = totalSegments - armSegments

  const armA = growArm(startX, startY, cols, rows, armSegments, -1)
  const armB = growArm(startX, startY, cols, rows, otherArmSegments, -1)

  return [...armA.slice(1).reverse(), ...armB]
}

function buildCircuitPath(gridPoints: Point[], cellSize: number): CircuitPath {
  const points = gridPoints.map((p) => ({ x: p.x * cellSize, y: p.y * cellSize }))
  const segmentLengths: number[] = []
  const vertexDistances: number[] = [0]
  let totalLength = 0

  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    segmentLengths.push(length)
    totalLength += length
    vertexDistances.push(totalLength)
  }

  return { points, segmentLengths, vertexDistances, totalLength }
}

export function computeCircuitGrid({
  width,
  height,
  cellSize = 30,
  sectorSize = 125,
}: GridOptions): CircuitGrid {
  const cols = Math.max(4, Math.floor(width / cellSize))
  const rows = Math.max(4, Math.floor(height / cellSize))
  const sectorCols = Math.max(3, Math.round(width / sectorSize))
  const sectorRows = Math.max(3, Math.round(height / sectorSize))

  return {
    cols,
    rows,
    sectorCols,
    sectorRows,
    sectorWidth: cols / sectorCols,
    sectorHeight: rows / sectorRows,
    cellSize,
  }
}

const SECTOR_SEED_JITTER = 0.4

export function generateSectorPath(
  grid: CircuitGrid,
  sectorX: number,
  sectorY: number,
): CircuitPath {
  const centerX = sectorX * grid.sectorWidth + grid.sectorWidth / 2
  const centerY = sectorY * grid.sectorHeight + grid.sectorHeight / 2
  const jitterX = (Math.random() - 0.5) * grid.sectorWidth * SECTOR_SEED_JITTER
  const jitterY = (Math.random() - 0.5) * grid.sectorHeight * SECTOR_SEED_JITTER

  const gx = Math.max(0, Math.min(grid.cols - 1, Math.round(centerX + jitterX)))
  const gy = Math.max(0, Math.min(grid.rows - 1, Math.round(centerY + jitterY)))

  const gridPoints = growPath(gx, gy, grid.cols, grid.rows)
  return buildCircuitPath(gridPoints, grid.cellSize)
}

export function pointAtDistance(path: CircuitPath, distance: number): Point {
  const target = Math.max(0, Math.min(distance, path.totalLength))
  let traveled = 0

  for (let i = 0; i < path.segmentLengths.length; i++) {
    const segLen = path.segmentLengths[i]
    if (target <= traveled + segLen || i === path.segmentLengths.length - 1) {
      const t = segLen === 0 ? 0 : (target - traveled) / segLen
      const a = path.points[i]
      const b = path.points[i + 1]
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    traveled += segLen
  }

  return path.points[path.points.length - 1]
}

export function subPath(path: CircuitPath, fromDist: number, toDist: number): Point[] {
  const from = Math.max(0, fromDist)
  const to = Math.min(path.totalLength, toDist)
  if (to <= from) return [pointAtDistance(path, from)]

  const result: Point[] = [pointAtDistance(path, from)]
  let traveled = 0

  for (let i = 0; i < path.points.length; i++) {
    if (i > 0) traveled += path.segmentLengths[i - 1]
    if (traveled > from && traveled < to) {
      result.push(path.points[i])
    }
  }

  result.push(pointAtDistance(path, to))
  return result
}
