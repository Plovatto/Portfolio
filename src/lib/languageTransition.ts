import i18n from '../i18n'
import type { Language } from '../i18n'
import { prefersReducedMotion } from '../hooks/useReducedMotion'
import { cancelScramble, scrambleNodes } from './scramble'
import type { ScrambleTarget } from './scramble'

const ROOTS = ['.editor-tabs', 'main', '.status-bar']
const SKIP = '.code-view, .name-art, script, style'

const BASE_MS = 650
const PER_CHAR_MS = 9
const MAX_MS = 1700
const STAGGER_MS = 35
const MAX_DELAY_MS = 600

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function visibleTextNodes() {
  const nodes: { node: Text; top: number; left: number }[] = []
  const range = document.createRange()
  for (const selector of ROOTS) {
    const root = document.querySelector(selector)
    if (!root) continue
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.textContent?.trim() && !node.parentElement?.closest(SKIP)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    })
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      range.selectNodeContents(node)
      const rect = range.getBoundingClientRect()
      if (rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
        nodes.push({ node: node as Text, top: rect.top, left: rect.left })
      }
    }
  }
  return nodes
}

export async function switchLanguage(language: Language) {
  cancelScramble()
  const reduced = prefersReducedMotion()
  const before = reduced ? null : new Map(visibleTextNodes().map(({ node }) => [node, node.data]))

  await i18n.changeLanguage(language)
  if (!before) return
  await nextFrame()
  await nextFrame()

  const changed = visibleTextNodes()
    .filter(({ node }) => before.get(node) !== node.data)
    .sort((a, b) => a.top - b.top || a.left - b.left)

  const targets: ScrambleTarget[] = changed.map(({ node }, i) => ({
    node,
    delay: Math.min(i * STAGGER_MS, MAX_DELAY_MS),
    duration: Math.min(BASE_MS + node.data.length * PER_CHAR_MS, MAX_MS),
  }))
  scrambleNodes(targets)
}
