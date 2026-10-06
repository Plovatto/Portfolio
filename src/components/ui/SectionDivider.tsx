import { useReveal } from '../../hooks/useReveal'

const BITES = 7

export function SectionDivider() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className="wrap section-divider" aria-hidden="true" data-quiet>
      <span className="section-divider-score rv-scan" />
      <span className="section-divider-tab rv-fade">
        {Array.from({ length: BITES }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <span className="section-divider-score rv-scan" />
    </div>
  )
}
