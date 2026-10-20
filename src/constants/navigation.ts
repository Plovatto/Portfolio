import type { IconName } from '../components/ui/Icon'

export type SectionId = 'home' | 'projects' | 'stack' | 'experience' | 'contact'

interface NavItem {
  id: SectionId
  icon: IconName
  tabIcon: 'react' | 'branch'
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', icon: 'home', tabIcon: 'react' },
  { id: 'projects', icon: 'folder', tabIcon: 'react' },
  { id: 'stack', icon: 'code', tabIcon: 'react' },
  { id: 'experience', icon: 'branch', tabIcon: 'branch' },
  { id: 'contact', icon: 'mail', tabIcon: 'react' },
]

export const SECTION_IDS = NAV_ITEMS.map((item) => item.id)
