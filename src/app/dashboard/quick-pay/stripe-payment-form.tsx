'use client'

import { useState, useEffect } from 'react'
import { loadStripe, type Stripe as StripeInstance } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
// Access the publishable key directly from the NEXT_PUBLIC_ env var
// (do not import server-only @/lib/stripe here — that module instantiates the
// server-side Stripe SDK and must not run in the browser bundle)
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

// ── Inner form (needs to be inside <Elements>) ────────────────────────────────

interface InnerFormProps {
  onSuccess: () => void
  onCancel: () => void
  total: number
}

function StripeInnerForm({ onSuccess, onCancel, total }: InnerFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // No redirect needed; we handle success in-page
          return_url: window.location.href,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message ?? 'Payment failed. Please try again.')
        setIsProcessing(false)
      } else {
        onSuccess()
      }
    } catch (err) {
      console.error('[StripePaymentForm] confirmPayment error:', err)
      setErrorMessage('An unexpected error occurred. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </button>
      </div>
    </form>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface StripePaymentFormProps {
  clientSecret: string
  total: number
  onSuccess: () => void
  onCancel: () => void
}

export function StripePaymentForm({
  clientSecret,
  total,
  onSuccess,
  onCancel,
}: StripePaymentFormProps) {
  const [stripeInstance, setStripeInstance] = useState<StripeInstance | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      setLoadError('Stripe is not configured. Please contact support.')
      return
    }

    loadStripe(STRIPE_PUBLISHABLE_KEY)
      .then((s) => {
        if (s) {
          setStripeInstance(s)
        } else {
          setLoadError('Failed to load Stripe. Please try again.')
        }
      })
      .catch((err) => {
        console.error('[StripePaymentForm] loadStripe error:', err)
        setLoadError('Failed to load Stripe. Please try again.')
      })
  }, [])

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{loadError}</p>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  if (!stripeInstance) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Loading payment form...</span>
      </div>
    )
  }

  return (
    <Elements
      stripe={stripeInstance}
      options={{ clientSecret, appearance: { theme: 'stripe' } }}
    >
      <StripeInnerForm
        total={total}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}
