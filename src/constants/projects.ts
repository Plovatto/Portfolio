export interface SchematicNode {
  x: number
  y: number
  label: string
  detail: string
}

export interface Schematic {
  nodes: readonly SchematicNode[]
  wires: readonly string[]
  pads: readonly [number, number][]
}

export interface ProjectLink {
  label: string
  href: string
}

export interface ProjectImage {
  name: string
  width: number
  height: number
}

export interface Project {
  id: 'sparkchat' | 'petland'
  name: string
  refdes: string
  image: ProjectImage
  flip?: boolean
  cropImage?: boolean
  techs: readonly string[] | SplitTechs
  links: readonly ProjectLink[]
  schematic: Schematic
}

export type SplitTechs = { client: readonly string[]; server: readonly string[] }

export function isSplitTechs(techs: Project['techs']): techs is SplitTechs {
  return !Array.isArray(techs)
}

export const SCHEMATIC_BOX = { width: 190, height: 62 } as const

export const PROJECTS: readonly Project[] = [
  {
    id: 'sparkchat',
    name: 'SparkChat',
    refdes: 'U2',
    image: { name: 'sparkchat', width: 1280, height: 641 },
    techs: {
      client: ['React', 'TypeScript', 'libsodium', 'Socket.IO', 'Vite'],
      server: ['Node.js', 'Express', 'Turso', 'Cloudflare R2', 'Gemini'],
    },
    links: [
      { label: 'app', href: 'https://plovatto.github.io/SparkChat/' },
      { label: 'client', href: 'https://github.com/Plovatto/SparkChat' },
      { label: 'api', href: 'https://github.com/Plovatto/API-SparkChat' },
    ],
    schematic: {
      nodes: [
        { x: 30, y: 65, label: 'client', detail: 'clientDetail' },
        { x: 255, y: 65, label: 'socket', detail: 'socketDetail' },
        { x: 480, y: 65, label: 'api', detail: 'apiDetail' },
        { x: 255, y: 175, label: 'database', detail: 'databaseDetail' },
        { x: 255, y: 255, label: 'files', detail: 'filesDetail' },
      ],
      wires: ['M220 96H255', 'M445 96H480', 'M575 127V206H445', 'M575 206V286H445'],
      pads: [
        [220, 96],
        [255, 96],
        [445, 96],
        [480, 96],
        [445, 206],
        [445, 286],
      ],
    },
  },
  {
    id: 'petland',
    name: 'PetLand',
    refdes: 'U3',
    image: { name: 'petland', width: 1280, height: 800 },
    flip: true,
    cropImage: true,
    techs: ['React', 'TypeScript', 'Tailwind', 'Motion', 'i18next', 'EmailJS'],
    links: [
      { label: 'site', href: 'https://plovatto.github.io/PetLand/' },
      { label: 'code', href: 'https://github.com/Plovatto/PetLand' },
    ],
    schematic: {
      nodes: [
        { x: 30, y: 70, label: 'sections', detail: 'sectionsDetail' },
        { x: 255, y: 70, label: 'motion', detail: 'motionDetail' },
        { x: 480, y: 70, label: 'contact', detail: 'contactDetail' },
        { x: 255, y: 200, label: 'i18n', detail: 'i18nDetail' },
      ],
      wires: ['M220 101H255', 'M445 101H480', 'M350 132V200'],
      pads: [
        [220, 101],
        [255, 101],
        [445, 101],
        [480, 101],
        [350, 132],
        [350, 200],
      ],
    },
  },
]
