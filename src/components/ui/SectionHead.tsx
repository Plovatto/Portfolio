import type { CSSProperties } from 'react'
import { useReveal } from '../../hooks/useReveal'

interface SectionHeadProps {
  title: string
  lede: string
  code?: boolean
}

export function SectionHead({ title, lede, code }: SectionHeadProps) {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className="section-head" data-quiet>
      <h2
        className={`display h2 rv-clip ${code ? 'is-code' : ''}`}
        style={{ '--i': 0 } as CSSProperties}
      >
        {title}
      </h2>
      <p className="lede rv" style={{ '--i': 2 } as CSSProperties}>
        {lede}
      </p>
    </div>
  )
}
