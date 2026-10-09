type LayerId = 'interface' | 'server' | 'data' | 'infra'

interface StackLayer {
  id: LayerId
  level: number
  techs: readonly string[]
}

export const STACK_LAYERS: readonly StackLayer[] = [
  { id: 'interface', level: 3, techs: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS'] },
  { id: 'server', level: 2, techs: ['Node.js', 'Express'] },
  { id: 'data', level: 1, techs: ['MySQL', 'SQL'] },
  { id: 'infra', level: 0, techs: ['Deploy', 'Git', 'GitHub'] },
]
