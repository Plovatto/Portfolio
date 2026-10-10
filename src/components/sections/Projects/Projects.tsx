import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { PROJECTS } from '../../../constants/projects'
import { useReveal } from '../../../hooks/useReveal'
import { Chip } from '../../ui/Chip'
import { SectionHead } from '../../ui/SectionHead'
import { ProjectCard } from './ProjectCard'
import './projects.css'

function NextProjectSlot() {
  const { t } = useTranslation()
  const ref = useReveal<HTMLElement>()

  return (
    <Chip ref={ref} as="article" refdes="U4" className="project project-wide project-slot rv-fade">
      <div className="socket rv" style={{ '--i': 0 } as CSSProperties} aria-hidden="true">
        <span />
      </div>
      <div className="project-body">
        <div className="project-top rv" style={{ '--i': 1 } as CSSProperties}>
          <h3 className="display">{t('projects.next.title')}</h3>
          <span className="live is-pending">
            <i />
            {t('projects.building')}
          </span>
        </div>
        <p className="rv" style={{ '--i': 2 } as CSSProperties}>
          {t('projects.next.description')}
        </p>
      </div>
    </Chip>
  )
}

export function Projects() {
  const { t } = useTranslation()

  return (
    <section id="projects" className="wrap section">
      <SectionHead title={t('projects.title')} lede={t('projects.lede')} />
      <div className="projects">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        <NextProjectSlot />
      </div>
    </section>
  )
}
