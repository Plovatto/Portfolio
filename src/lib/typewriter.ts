export interface Segment {
  text: string
  className?: string
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(id)
      reject(signal.reason)
    })
  })

export async function typeSegments(
  container: HTMLElement,
  segments: Segment[],
  speed: number,
  signal: AbortSignal,
) {
  for (const segment of segments) {
    const target = segment.className ? document.createElement('span') : document.createTextNode('')
    if (target instanceof HTMLElement) target.className = segment.className!
    container.append(target)
    if (!speed) {
      target.textContent = segment.text
      continue
    }
    for (const char of segment.text) {
      signal.throwIfAborted()
      target.textContent += char
      await wait(speed, signal)
    }
  }
}
