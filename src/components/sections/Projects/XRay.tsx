import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { SCHEMATIC_BOX } from '../../../constants/projects'
import type { ProjectImage, Schematic } from '../../../constants/projects'

const imageUrl = (image: ProjectImage, width: number) =>
  `${import.meta.env.BASE_URL}projects/${image.name}-${width}.webp`

interface XRayProps {
  image: ProjectImage
  alt: string
  crop?: boolean
  schematic: Schematic
  label: (key: string) => string
  note: readonly string[]
  style?: CSSProperties
}

const LABEL_PADDING = 28
const MIN_LABEL_SIZE = 7

function fitLabels(svg: SVGSVGElement) {
  const max = SCHEMATIC_BOX.width - LABEL_PADDING
  for (const text of svg.querySelectorAll<SVGTextElement>('[data-fit]')) {
    text.style.fontSize = ''
    let size = parseFloat(getComputedStyle(text).fontSize)
    while (text.getComputedTextLength() > max && size > MIN_LABEL_SIZE) {
      size -= 0.5
      text.style.fontSize = `${size}px`
    }
  }
}

function moveLens(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== 'mouse') return
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--lx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--ly', `${e.clientY - rect.top}px`)
}

function hideLens(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType !== 'mouse') return
  e.currentTarget.style.setProperty('--lx', '-200px')
  e.currentTarget.style.setProperty('--ly', '-200px')
}

function toggleOnTap(e: PointerEvent<HTMLDivElement>) {
  if (e.pointerType === 'mouse') return
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--lx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--ly', `${e.clientY - rect.top}px`)
  if (!el.classList.contains('is-touch')) {
    el.classList.add('is-touch')
    void el.offsetWidth
  }
  el.classList.toggle('is-revealed')
}

export function XRay({ image, alt, crop, schematic, label, note, style }: XRayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const labels = schematic.nodes.map((node) => `${label(node.label)}|${label(node.detail)}`).join()

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    document.fonts.ready.then(() => fitLabels(svg))
  }, [labels])

  return (
    <div
      className={`xray rv-scan ${crop ? 'is-cropped' : ''}`}
      style={style}
      onPointerMove={moveLens}
      onPointerLeave={hideLens}
      onPointerUp={toggleOnTap}
    >
      <img
        src={imageUrl(image, 1280)}
        srcSet={`${imageUrl(image, 640)} 640w, ${imageUrl(image, 1280)} 1280w`}
        sizes="(max-width: 900px) calc(100vw - 2.5rem), 36rem"
        width={image.width}
        height={image.height}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
      <div className="xray-schematic">
        <svg ref={svgRef} viewBox="0 0 700 350" aria-hidden="true">
          {schematic.wires.map((d) => (
            <path key={d} className="sch-wire" d={d} />
          ))}
          {schematic.nodes.map((node) => (
            <g key={node.label}>
              <rect
                className="sch-box"
                x={node.x}
                y={node.y}
                width={SCHEMATIC_BOX.width}
                height={SCHEMATIC_BOX.height}
                rx="6"
              />
              <text className="sch-title" x={node.x + 16} y={node.y + 27} data-fit="">
                {label(node.label)}
              </text>
              <text className="sch-detail" x={node.x + 16} y={node.y + 46} data-fit="">
                {label(node.detail)}
              </text>
            </g>
          ))}
          {schematic.pads.map(([cx, cy]) => (
            <circle key={`${cx},${cy}`} className="sch-pad" cx={cx} cy={cy} r="3.5" />
          ))}
          {note.map((line, i) => (
            <text key={line} className="sch-detail" x="30" y={300 + i * 18}>
              {line}
            </text>
          ))}
        </svg>
      </div>
      <div className="xray-ring" />
    </div>
  )
}
