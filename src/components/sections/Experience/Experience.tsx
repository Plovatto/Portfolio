import { useTranslation } from 'react-i18next'
import { EXPERIENCE } from '../../../constants/experience'
import { useReveal } from '../../../hooks/useReveal'
import { Chip } from '../../ui/Chip'
import { SectionHead } from '../../ui/SectionHead'
import { CommitRow } from './CommitRow'
import './experience.css'

export function Experience() {
  const { t } = useTranslation()
  const ref = useReveal<HTMLElement>()

  return (
    <section id="experience" className="wrap section">
      <SectionHead code title={t('experience.title')} lede={t('experience.lede')} />
      <Chip ref={ref} as="article" refdes="U5" className="gitlog rv-fade">
        <div className="gitlog-header rv">
          <span>{t('experience.graph')}</span>
          <span className="gitlog-lane is-main">
            <i />
            {t('experience.mainLane')}
          </span>
          <span className="gitlog-lane is-studies">
            <i />
            {t('experience.studiesLane')}
          </span>
        </div>
        <div>
          {EXPERIENCE.map((commit, i) => (
            <CommitRow
              key={commit.id}
              commit={commit}
              first={i === 0}
              last={i === EXPERIENCE.length - 1}
            />
          ))}
        </div>
      </Chip>
    </section>
  )
}
