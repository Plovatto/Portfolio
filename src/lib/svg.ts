const SVG_NS = 'http://www.w3.org/2000/svg'

type Attributes = Record<string, string | number>

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value))
  parent?.appendChild(node)
  return node
}
