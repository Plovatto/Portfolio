import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { PROFILE } from '../../../constants/profile'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { NameplateArt } from './nameplateArt'

interface NameplateProps {
  powered: boolean
  svgRef: RefObject<SVGSVGElement | null>
}

const FALLBACK_DELAY = 3600
const SIGNATURE_INTERVAL = 3600
const AMBIENT_INTERVAL = 8000

interface BoardCurrentDetail {
  x: number
  y: number
}

export function Nameplate({ powered, svgRef }: NameplateProps) {
  const plateRef = useRef<HTMLHeadingElement>(null)
  const artRef = useRef<NameplateArt | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const plate = plateRef.current
    const svg = svgRef.current
    if (!plate || !svg) return
    let cancelled = false

    const onCurrent = (e: Event) => {
      const art = artRef.current
      if (!art) return
      const { x, y } = (e as CustomEvent<BoardCurrentDetail>).detail
      const point = art.toSvg(x, y, plate.getBoundingClientRect().width)
      art.ignite(point.x, point.y)
    }
    const onPointerMove = (e: PointerEvent) => {
      const art = artRef.current
      if (!art?.isLit) return
      const rect = plate.getBoundingClientRect()
      const point = art.toSvg(e.clientX - rect.left, 0, rect.width)
      if (art.isOverDoubleT(point.x)) art.signature()
    }

    document.fonts.ready.then(() => {
      if (cancelled) return
      artRef.current = new NameplateArt(svg, PROFILE.name, reduced)
    })
    plate.addEventListener('board:current', onCurrent)
    plate.addEventListener('pointermove', onPointerMove)
    return () => {
      cancelled = true
      plate.removeEventListener('board:current', onCurrent)
      plate.removeEventListener('pointermove', onPointerMove)
      artRef.current?.destroy()
      artRef.current = null
    }
  }, [reduced, svgRef])

  useEffect(() => {
    if (!powered) return
    const ignite = () => {
      const art = artRef.current
      if (!art || document.hidden) return
      const point = art.randomEdgePoint()
      art.ignite(point.x, point.y)
    }
    const fallback = window.setTimeout(
      () => {
        if (!artRef.current?.isLit) ignite()
      },
      reduced ? 0 : FALLBACK_DELAY,
    )
    const signature = window.setInterval(() => {
      if (artRef.current?.isLit && !document.hidden) artRef.current.signature()
    }, SIGNATURE_INTERVAL)
    const ambient = window.setInterval(() => {
      if (artRef.current?.isLit) ignite()
    }, AMBIENT_INTERVAL)
    return () => {
      clearTimeout(fallback)
      clearInterval(signature)
      clearInterval(ambient)
    }
  }, [powered, reduced])

  return (
    <h1 ref={plateRef} className="nameplate" data-chip="N1" data-bare="" data-pins="tb">
      <svg ref={svgRef} className="name-art" role="img" aria-label={PROFILE.name} />
    </h1>
  )
}
