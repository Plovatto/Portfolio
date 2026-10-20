import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { STACK_LAYERS } from '../../../constants/stack'
import { useReveal } from '../../../hooks/useReveal'
import { useStackScroll } from './useStackScroll'
import './stack.css'

const order = (i: number) => ({ '--i': i }) as CSSProperties
const plate = (p: number) => ({ '--p': p }) as CSSProperties
const part = (e: number) => ({ '--e': e }) as CSSProperties
const PLATES = [...STACK_LAYERS].sort((a, b) => a.level - b.level)

export function Stack() {
  const { t } = useTranslation()
  const { sectionRef, platesRef, listRef } = useStackScroll()
  const copyRef = useReveal<HTMLDivElement>()
  const sceneRef = useReveal<HTMLDivElement>()

  return (
    <section ref={sectionRef} id="stack" className="stack" data-board-pin="">
      <div className="wrap stack-sticky">
        <div ref={copyRef} className="stack-copy rv-fade" data-quiet>
          <h2 className="display h2 rv-clip" style={order(0)}>
            {t('stack.title')}
          </h2>
          <p className="lede rv" style={order(0)}>
            {t('stack.lede')}
          </p>
          <ol ref={listRef} className="stack-layers">
            {STACK_LAYERS.map((layer, i) => (
              <li key={layer.id} style={order(i + 1)} data-level={layer.level}>
                <b className="rv-clip">{t(`stack.layers.${layer.id}`)}</b>
                <span className="rv">{layer.techs.join(', ')}</span>
              </li>
            ))}
          </ol>
        </div>
        <div ref={sceneRef} className="stack-scene rv-fade" data-quiet>
          <div ref={platesRef} className="stack-plates">
            {PLATES.map((layer, p) =>
              layer.id === 'interface' ? (
                <div
                  key={layer.id}
                  className="stack-plate is-chip"
                  data-level={layer.level}
                  style={plate(p)}
                >
                  <div className="stack-die" />
                  <span className="stack-plate-name">{t(`stack.plates.${layer.id}`)}</span>
                </div>
              ) : (
                <div
                  key={layer.id}
                  className="stack-plate"
                  data-level={layer.level}
                  style={plate(p)}
                >
                  <div className="stack-plate-parts">
                    {layer.techs.map((tech, e) => (
                      <em key={tech} style={part(e)}>
                        {tech}
                      </em>
                    ))}
                  </div>
                  <span className="stack-plate-name">{t(`stack.plates.${layer.id}`)}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
