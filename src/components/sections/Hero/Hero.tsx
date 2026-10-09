import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { CodeIntro } from './CodeIntro'
import type { OpeningStage } from './CodeIntro'
import { Nameplate } from './Nameplate'
import { Terminal } from './Terminal'
import './hero.css'

interface HeroProps {
  powered: boolean
  onStage: (stage: OpeningStage) => void
  onCompiled: () => void
}

const stagger = (i: number) => ({ '--i': i }) as CSSProperties

export function Hero({ powered, onStage, onCompiled }: HeroProps) {
  const { t } = useTranslation()
  const nameRef = useRef<SVGSVGElement>(null)

  return (
    <section id="home" className={`wrap hero ${powered ? 'is-compiled' : ''}`}>
      <Nameplate powered={powered} svgRef={nameRef} />
      <div className="hero-copy" data-quiet>
        <p className="display hero-role hero-fade" style={stagger(0)}>
          {t('hero.role')}
        </p>
        <p className="lede hero-fade" style={stagger(1)}>
          {t('hero.lede')}
        </p>
        <div className="hero-actions hero-fade" style={stagger(2)}>
          <a className="btn btn-primary" href="#projects">
            {t('hero.viewProjects')}
          </a>
          <a className="btn" href="#contact">
            {t('hero.getInTouch')}
          </a>
        </div>
      </div>
      <Terminal powered={powered} />
      <CodeIntro nameTarget={nameRef} onStage={onStage} onCompiled={onCompiled} />
    </section>
  )
}
