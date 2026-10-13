import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContactField, ContactValues } from '../../../lib/contact'
import { SEND_STEPS } from './sendSteps'
import type { SendStatus, StepState } from './sendSteps'

interface RequestPreviewProps {
  values: ContactValues
  status: SendStatus
  steps: readonly StepState[]
  deliveredMs: number | null
}

const FIELDS: readonly ContactField[] = ['name', 'email', 'message']
const order = (i: number) => ({ '--i': i }) as CSSProperties

export function RequestPreview({ values, status, steps, deliveredMs }: RequestPreviewProps) {
  const { t } = useTranslation()

  return (
    <aside className="request" aria-label={t('contact.preview')}>
      <div className="request-header rv" style={order(0)}>
        <span>{t('contact.endpoint')}</span>
        <span className="request-status" data-state={status}>
          {t(`contact.status.${status}`)}
        </span>
      </div>
      <pre className="rv" style={order(1)}>
        {'{\n'}
        {FIELDS.map((field, i) => (
          <span key={field}>
            {'  '}
            <span className="json-key">"{t(`contact.payloadKeys.${field}`)}"</span>:{' '}
            <span className="json-string">"{values[field]}"</span>
            {i < FIELDS.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {'}'}
      </pre>
      <ol className="request-steps">
        {SEND_STEPS.map((step, i) => (
          <li key={step} className="rv" style={order(i + 2)} data-state={steps[i]}>
            <i />
            {step === 'delivered' && deliveredMs !== null
              ? t('contact.steps.deliveredIn', { ms: deliveredMs })
              : t(`contact.steps.${step}`)}
          </li>
        ))}
      </ol>
    </aside>
  )
}
