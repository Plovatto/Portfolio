import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { isSplitTechs } from '../../../constants/projects'
import type { Project } from '../../../constants/projects'
import { useReveal } from '../../../hooks/useReveal'
import { Chip } from '../../ui/Chip'
import { ProjectPreview } from './ProjectPreview'
import { XRay } from './XRay'

const order = (i: number) => ({ '--i': i }) as CSSProperties

function Tags({ items, index }: { items: readonly string[]; index: number }) {
  return (
    <div className="tags" style={order(index)}>
      {items.map((tech, i) => (
        <span key={tech} className="tag" style={{ '--t': i } as CSSProperties}>
          {tech}
        </span>
      ))}
    </div>
  )
}

export function ProjectCard({ project }: { project: Project }) {
  const { t } = useTranslation()
  const ref = useReveal<HTMLElement>()
  const key = (path: string) => `projects.${project.id}.${path}`
  const { techs } = project
  const split = isSplitTechs(techs)
  const [previewing, setPreviewing] = useState(false)

  const body = (
    <div className="project-body">
      <div className="project-top rv-clip" style={order(0)}>
        <h3 className="display">{project.name}</h3>
        <span className="live">
          <i />
          {t('projects.live')}
        </span>
      </div>
      <p className="rv" style={order(1)}>
        {t(key('description'))}
      </p>
      {!split ? (
        <Tags items={techs} index={2} />
      ) : (
        <div className="project-halves rv" style={order(2)}>
          <div className="project-half">
            <b>{t('projects.client')}</b>
            <Tags items={techs.client} index={3} />
          </div>
          <div className="project-half">
            <b>{t('projects.server')}</b>
            <Tags items={techs.server} index={4} />
          </div>
        </div>
      )}
      <div className="project-links rv" style={order(split ? 5 : 3)}>
        <button
          type="button"
          className="project-run"
          aria-haspopup="dialog"
          onClick={() => setPreviewing(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
          {t('projects.run')}
        </button>
        {project.links.map((link) => (
          <a key={link.href} href={link.href}>
            {t(key(`links.${link.label}`))}
          </a>
        ))}
      </div>
    </div>
  )

  const media = (
    <div className="project-media">
      <XRay
        image={project.image}
        alt={t(key('imageAlt'))}
        crop={project.cropImage}
        schematic={project.schematic}
        label={(label) => t(key(`schematic.${label}`))}
        note={t(key('schematic.note'), { returnObjects: true }) as string[]}
        style={order(1)}
      />
      <span className="xray-hint is-pointer rv" style={order(5)}>
        {t('projects.xrayHint')}
      </span>
      <span className="xray-hint is-touch rv" style={order(5)}>
        {t('projects.xrayHintTouch')}
      </span>
    </div>
  )

  return (
    <Chip
      ref={ref}
      as="article"
      refdes={project.refdes}
      className={`project project-wide rv-fade ${project.flip ? 'is-flipped' : ''}`}
    >
      {project.flip ? media : body}
      {project.flip ? body : media}
      <ProjectPreview
        name={project.name}
        url={project.preview}
        open={previewing}
        onClose={() => setPreviewing(false)}
      />
    </Chip>
  )
}
