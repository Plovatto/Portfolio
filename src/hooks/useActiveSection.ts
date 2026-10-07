import { useEffect, useState } from 'react'
import { SECTION_IDS } from '../constants/navigation'
import type { SectionId } from '../constants/navigation'

export function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>(SECTION_IDS[0])

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    const observer = new IntersectionObserver(
      (entries) => {
        const crossing = entries.find((entry) => entry.isIntersecting)
        if (crossing) setActive(crossing.target.id as SectionId)
      },
      { rootMargin: '-40% 0px -60% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return active
}
