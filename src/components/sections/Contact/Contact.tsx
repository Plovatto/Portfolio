import { useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { prefersReducedMotion } from '../../../hooks/useReducedMotion'
import { useReveal } from '../../../hooks/useReveal'
import { classifyFailure, sendContact, validateContact } from '../../../lib/contact'
import { getTurnstileToken } from '../../../lib/turnstile'
import type {
  ContactErrors,
  ContactFailure,
  ContactField,
  ContactValues,
} from '../../../lib/contact'
import { Chip } from '../../ui/Chip'
import { ContactSuccess } from './ContactSuccess'
import { RequestPreview } from './RequestPreview'
import { IDLE_STEPS, SEND_STEPS } from './sendSteps'
import type { SendStatus, StepState } from './sendSteps'
import './contact.css'

const STEP_MIN_MS = 450
const EMPTY: ContactValues = { name: '', email: '', message: '' }
const FIELDS: readonly ContactField[] = ['name', 'email', 'message']
const VERIFY_STEP = SEND_STEPS.indexOf('verify')
const order = (i: number) => ({ '--i': i }) as CSSProperties
const fieldId = (name: ContactField) => `contact-${name}`

interface ContactProps {
  onSent: () => void
}

export function Contact({ onSent }: ContactProps) {
  const { t } = useTranslation()
  const ref = useReveal<HTMLElement>()
  const fillRef = useRef<HTMLSpanElement>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [status, setStatus] = useState<SendStatus>('idle')
  const [steps, setSteps] = useState<readonly StepState[]>(IDLE_STEPS)
  const [deliveredMs, setDeliveredMs] = useState<number | null>(null)
  const [failure, setFailure] = useState<ContactFailure | null>(null)
  const [sent, setSent] = useState<ContactValues | null>(null)
  const [debugReason, setDebugReason] = useState('')
  const sending = status === 'sending'

  const update =
    (field: ContactField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setValues((current) => ({ ...current, [field]: value }))
      if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
    }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (sending) return
    const found = validateContact(values)
    setErrors(found)
    const firstInvalid = FIELDS.find((name) => found[name])
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus()
      return
    }

    const reduced = prefersReducedMotion()
    const hold = (ms: number) => new Promise((resolve) => setTimeout(resolve, reduced ? 0 : ms))
    let current = 0
    const step = (active: number) => {
      current = active
      setSteps(
        SEND_STEPS.map((_, i) => (i < active ? 'done' : i === active ? 'active' : 'pending')),
      )
    }
    const fillTo = (share: number) => {
      const fill = fillRef.current
      if (!fill) return
      const from = getComputedStyle(fill).transform
      fill.getAnimations().forEach((animation) => animation.cancel())
      fill.animate(
        [{ transform: from === 'none' ? 'scaleX(0)' : from }, { transform: `scaleX(${share})` }],
        {
          duration: reduced ? 0 : 450,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          fill: 'forwards',
        },
      )
    }

    setStatus('sending')
    setFailure(null)
    setDeliveredMs(null)
    setDebugReason('')
    try {
      step(0)
      fillTo(0.15)
      await hold(STEP_MIN_MS)
      step(VERIFY_STEP)
      fillTo(0.4)
      const [token] = await Promise.all([
        getTurnstileToken(turnstileRef.current!),
        hold(STEP_MIN_MS),
      ])
      step(2)
      fillTo(0.75)
      const [{ ms }] = await Promise.all([
        sendContact(values, { token, website: honeypotRef.current?.value ?? '' }),
        hold(STEP_MIN_MS),
      ])
      fillTo(1)
      setSteps(SEND_STEPS.map(() => 'done'))
      setDeliveredMs(ms)
      setSent(values)
      setValues(EMPTY)
      setStatus('ok')
      onSent()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[contact]', error)
        setDebugReason(error instanceof Error ? error.message : String(error))
      }
      setSteps(
        SEND_STEPS.map((_, i) => (i < current ? 'done' : i === current ? 'error' : 'pending')),
      )
      setFailure(classifyFailure(error, current === VERIFY_STEP, navigator.onLine))
      setStatus('error')
      fillRef.current?.getAnimations().forEach((animation) => animation.cancel())
    }
  }

  const reset = () => {
    setStatus('idle')
    setSteps(IDLE_STEPS)
    setDeliveredMs(null)
    setSent(null)
    requestAnimationFrame(() => document.getElementById(fieldId('name'))?.focus())
  }

  const buttonLabel = sending
    ? t('contact.sending')
    : status === 'error'
      ? t('contact.retry')
      : t('contact.send')

  const field = (name: ContactField, index: number, multiline = false) => {
    const id = fieldId(name)
    const props = {
      id,
      value: values[name],
      onChange: update(name),
      readOnly: sending,
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `${id}-error` : undefined,
    }
    return (
      <label className="field rv" style={order(index)} htmlFor={id}>
        {t(`contact.fields.${name}`)}
        {multiline ? (
          <textarea {...props} />
        ) : (
          <input {...props} type={name === 'email' ? 'email' : 'text'} autoComplete={name} />
        )}
        {errors[name] ? (
          <span id={`${id}-error`} className="field-error">
            {t(`contact.errors.${errors[name]}`)}
          </span>
        ) : null}
      </label>
    )
  }

  return (
    <section id="contact" className="wrap section contact-section">
      <Chip ref={ref} as="article" refdes="U9" led={false} className="contact rv-fade">
        <form className="contact-form" noValidate onSubmit={submit}>
          <h2 className="display rv" style={order(0)}>
            {t('contact.title')}
          </h2>
          <p className="lede rv" style={order(1)}>
            {t('contact.lede')}
          </p>
          {status === 'ok' && sent ? (
            <ContactSuccess name={sent.name} email={sent.email} onAgain={reset} />
          ) : (
            <>
              {field('name', 2)}
              {field('email', 3)}
              {field('message', 4, true)}
              <input
                ref={honeypotRef}
                className="contact-honeypot"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <button
                className="btn btn-primary send-button rv"
                style={order(5)}
                type="submit"
                aria-busy={sending}
              >
                <span ref={fillRef} className="send-fill" />
                {sending ? <span className="send-spinner" aria-hidden="true" /> : null}
                <span>{buttonLabel}</span>
              </button>
              <div ref={turnstileRef} className="contact-turnstile" />
              {status === 'error' && failure ? (
                <p className="contact-error" role="alert">
                  {t(`contact.errors.${failure}`)}
                  {import.meta.env.DEV && debugReason ? <code> [dev: {debugReason}]</code> : null}
                </p>
              ) : null}
            </>
          )}
        </form>
        <RequestPreview
          values={sent ?? values}
          status={status}
          steps={steps}
          deliveredMs={deliveredMs}
        />
      </Chip>
    </section>
  )
}
