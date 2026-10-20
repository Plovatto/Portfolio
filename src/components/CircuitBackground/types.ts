export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export type PinLayout = 'lr' | 'tb' | 'all' | 'none'

export interface ChipSpec extends Rect {
  el: HTMLElement
  ref: string
  pins: PinLayout
  hero: boolean
  bare: boolean
  radius: number
}

export type Side = 0 | 1 | 2 | 3

export interface ChipPin {
  x: number
  y: number
  ex: number
  ey: number
  side: Side
  node: number
}

export interface BoardChip {
  spec: ChipSpec
  pins: ChipPin[]
  pinNodes: number[]
  tap: number[] | null
  tapY: number | null
}

export interface Trace {
  points: number[]
  width: number
}

export interface Via {
  x: number
  y: number
}

export interface Part {
  x: number
  y: number
  w: number
  h: number
  pin1: boolean
}

export interface Pad {
  x: number
  y: number
  w: number
  h: number
}

export interface Label {
  x: number
  y: number
  text: string
  align: CanvasTextAlign
  size: number
}

export interface SpineLine {
  points: number[]
  x: number
  top: number
  bottom: number
}

export interface Graph {
  nodeX: number[]
  nodeY: number[]
  adj: number[][]
}

export interface LayerData {
  traces: Trace[]
  vias: Via[]
  parts?: Part[]
  pads?: Pad[]
  labels?: Label[]
}

export interface BoardData extends LayerData {
  width: number
  height: number
  cell: number
  cols: number
  rows: number
  nodeOf: Int32Array
  graph: Graph
  chips: BoardChip[]
  spine: SpineLine[] | null
}
