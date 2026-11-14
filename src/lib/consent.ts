export type ConsentChoice = 'granted' | 'denied'

export interface ConsentState {
  choice: ConsentChoice | null
  asking: boolean
}

const STORAGE_KEY = 'portfolio-consent'

const listeners = new Set<() => void>()
let state: ConsentState | undefined

function readStored(): ConsentChoice | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'granted' || stored === 'denied' ? stored : null
  } catch {
    return null
  }
}

function update(next: ConsentState) {
  state = next
  listeners.forEach((listener) => listener())
}

export function getConsent(): ConsentState {
  if (!state) {
    const choice = readStored()
    state = { choice, asking: choice === null }
  }
  return state
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function decideConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {}
  update({ choice, asking: false })
}

export function reopenConsent() {
  update({ ...getConsent(), asking: true })
}
