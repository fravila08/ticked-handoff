import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createDonationIntent } from '../data/db'
import { AlertIcon } from '../components/Icons'

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const PRESETS = [5, 10, 25, 50]
const MAX_DOLLARS = 10000

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1c2b4a',
      fontFamily: 'Public Sans, system-ui, sans-serif',
      '::placeholder': { color: '#7a8292' },
    },
    invalid: { color: '#b42318' },
  },
}

// "12.5" -> 1250 cents, or an error message. Positive, at most $10,000, at most 2 decimals.
function parseDollars(text) {
  const value = text.trim()
  if (!value) return { error: 'Enter an amount' }
  if (!/^\d+(\.\d{0,2})?$/.test(value)) {
    return { error: 'Enter a dollar amount with at most 2 decimals' }
  }
  const cents = Math.round(Number(value) * 100)
  if (cents < 1) return { error: 'Amount must be more than $0' }
  if (cents > MAX_DOLLARS * 100) return { error: 'The most you can give at once is $10,000' }
  return { cents }
}

const money = (cents) => `$${(cents / 100).toFixed(2)}`

function DonateForm() {
  const stripe = useStripe()
  const elements = useElements()
  const [preset, setPreset] = useState('10') // a preset in dollars, or 'custom'
  const [custom, setCustom] = useState('')
  const [amountError, setAmountError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // null | { type: 'success', cents } | { type: 'card', message } | { type: 'network' } | { type: 'server' }
  const [result, setResult] = useState(null)

  function reset() {
    setResult(null)
    setPreset('10')
    setCustom('')
    setAmountError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements || submitting) return

    const parsed = parseDollars(preset === 'custom' ? custom : preset)
    if (parsed.error) {
      setAmountError(parsed.error)
      return
    }
    setAmountError('')
    setSubmitting(true)
    setResult(null)

    let secret
    try {
      secret = await createDonationIntent(parsed.cents)
    } catch (err) {
      setResult({ type: err.network ? 'network' : 'server' })
      setSubmitting(false)
      return
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(secret, {
        payment_method: { card: elements.getElement(CardElement) },
      })
      if (error) {
        // Stripe's message is written for the donor ("Your card was declined."); codes stay hidden.
        const friendly = error.type === 'card_error' || error.type === 'validation_error'
        setResult({
          type: 'card',
          message: friendly && error.message ? error.message : 'The payment could not be completed.',
        })
      } else if (paymentIntent?.status === 'succeeded') {
        setResult({ type: 'success', cents: parsed.cents })
      } else {
        setResult({ type: 'card', message: 'The payment could not be completed.' })
      }
    } catch {
      setResult({ type: 'network' })
    }
    setSubmitting(false)
  }

  if (result?.type === 'success') {
    return (
      <div className="donate-success" role="status">
        <h2 className="donate-success-title">Thank you for your {money(result.cents)} donation</h2>
        <p>Your support keeps Ticked running. A receipt is on its way from Stripe if you gave an email address there.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>Donate again</button>
      </div>
    )
  }

  return (
    <form className="donate-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="donate-amounts" disabled={submitting}>
        <legend className="label">Amount</legend>
        <div className="donate-options">
          {PRESETS.map((d) => (
            <label key={d} className="donate-option">
              <input
                type="radio"
                name="amount"
                value={d}
                checked={preset === String(d)}
                onChange={() => { setPreset(String(d)); setAmountError('') }}
              />
              <span>${d}</span>
            </label>
          ))}
          <label className="donate-option">
            <input
              type="radio"
              name="amount"
              value="custom"
              checked={preset === 'custom'}
              onChange={() => setPreset('custom')}
            />
            <span>Other</span>
          </label>
        </div>
        {preset === 'custom' && (
          <div className="field">
            <label htmlFor="donate-custom" className="label">Custom amount (USD)</label>
            <input
              id="donate-custom"
              className="input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 7.50"
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setAmountError('') }}
              aria-invalid={amountError ? 'true' : 'false'}
              aria-describedby={amountError ? 'donate-amount-error' : undefined}
            />
          </div>
        )}
        {amountError && (
          <p id="donate-amount-error" className="field-error"><AlertIcon /> {amountError}</p>
        )}
      </fieldset>

      <div className="field">
        <span id="donate-card-label" className="label">Card details</span>
        <div className="donate-card" aria-labelledby="donate-card-label">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {result?.type === 'card' && (
        <p className="field-error" role="alert"><AlertIcon /> {result.message} Check the card details or try another card.</p>
      )}
      {(result?.type === 'network' || result?.type === 'server') && (
        <div className="error-banner" role="alert">
          <AlertIcon />
          <p className="error-banner-text">
            <strong>Something went wrong.</strong>{' '}
            {result.type === 'network'
              ? 'We could not reach the payment service. You have not been charged.'
              : 'The donation could not be started. You have not been charged.'}
          </p>
          <button type="submit" className="btn-link" disabled={submitting}>Retry</button>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-big btn-wide" disabled={submitting || !stripe}>
        {submitting ? 'Processing…' : 'Donate'}
      </button>
    </form>
  )
}

export default function Donate() {
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Support Ticked</h1>
        <p className="page-desc">
          Ticked is free to use. If it helps you get things done, you can buy us a coffee with a one-time donation.
        </p>
      </div>
      {stripePromise ? (
        <Elements stripe={stripePromise}>
          <DonateForm />
        </Elements>
      ) : (
        <div className="error-banner" role="alert">
          <AlertIcon />
          <p className="error-banner-text">
            <strong>Donations are not set up.</strong> Add VITE_STRIPE_PUBLISHABLE_KEY to .env.local and restart the dev server.
          </p>
        </div>
      )}
    </>
  )
}
