export type Lane = 'main' | 'studies'

export type LanePattern = 'studies-pass' | 'main-pass' | 'fork' | 'root'

export interface Commit {
  id: 'fullStack' | 'english' | 'internship' | 'degree' | 'technical'
  hash: string
  lane: Lane
  lanes: LanePattern
  head?: boolean
  branchLabel?: boolean
  initial?: boolean
}

export const EXPERIENCE: readonly Commit[] = [
  { id: 'fullStack', hash: 'a1c9e02', lane: 'main', lanes: 'studies-pass', head: true },
  { id: 'english', hash: '9d27b4e', lane: 'studies', lanes: 'main-pass', branchLabel: true },
  { id: 'internship', hash: '6f3ab41', lane: 'main', lanes: 'studies-pass' },
  { id: 'degree', hash: '3b8e0c7', lane: 'studies', lanes: 'fork' },
  { id: 'technical', hash: '0e1f2a9', lane: 'main', lanes: 'root', initial: true },
]
