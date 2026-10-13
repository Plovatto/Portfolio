export type SendStatus = 'idle' | 'sending' | 'ok' | 'error'
export type StepState = 'pending' | 'active' | 'done' | 'error'

export const SEND_STEPS = ['validate', 'verify', 'send', 'delivered'] as const

export const IDLE_STEPS: readonly StepState[] = SEND_STEPS.map(() => 'pending')
