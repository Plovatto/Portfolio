const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>/{}=+*#'

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

const NOISE_MS = 80

export function scrambleFrame(text: string, progress: number, pick = randomGlyph) {
  const resolved = Math.floor(text.length * progress)
  let out = text.slice(0, resolved)
  for (let i = resolved; i < text.length; i++) out += /\s/.test(text[i]) ? text[i] : pick()
  return out
}

export interface ScrambleTarget {
  node: Text
  delay: number
  duration: number
}

interface ScrambleItem extends ScrambleTarget {
  text: string
  written: string
  done: boolean
}

let active: { items: ScrambleItem[]; frame: number } | null = null

export function cancelScramble() {
  if (!active) return
  cancelAnimationFrame(active.frame)
  for (const item of active.items) {
    if (!item.done && item.node.data === item.written) item.node.data = item.text
  }
  active = null
}

export function scrambleNodes(targets: ScrambleTarget[]) {
  cancelScramble()
  const items: ScrambleItem[] = targets
    .filter(({ node }) => node.data.trim())
    .map((target) => ({ ...target, text: target.node.data, written: '', done: false }))
  if (!items.length) return

  for (const item of items) item.node.data = item.written = scrambleFrame(item.text, 0)

  const start = performance.now()
  let lastNoise = start
  const end = Math.max(...items.map((item) => item.delay + item.duration))
  const run = { items, frame: 0 }
  active = run

  const frame = (now: number) => {
    const elapsed = now - start
    const refreshNoise = now - lastNoise >= NOISE_MS
    if (refreshNoise) lastNoise = now
    for (const item of items) {
      if (item.done) continue
      if (item.node.data !== item.written) {
        item.done = true
        continue
      }
      const k = Math.min(1, Math.max(0, (elapsed - item.delay) / item.duration))
      if (k >= 1) {
        item.node.data = item.written = item.text
        item.done = true
      } else if (refreshNoise) {
        item.node.data = item.written = scrambleFrame(item.text, 1 - Math.pow(1 - k, 3))
      }
    }
    if (elapsed < end) run.frame = requestAnimationFrame(frame)
    else if (active === run) active = null
  }
  run.frame = requestAnimationFrame(frame)
}
