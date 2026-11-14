import { useSyncExternalStore } from 'react'
import { getConsent, subscribeConsent } from '../lib/consent'
import type { ConsentState } from '../lib/consent'

export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribeConsent, getConsent)
}
