import { type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Guard: require authenticated session
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Guard: Stripe must be configured
  if (!stripe) {
    return Response.json(
      { error: 'Stripe is not configured on this server' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json() as {
      amount?: number
      currency?: string
      description?: string
      salonId?: string
      invoiceId?: string
    }

    const { amount, currency = 'usd', description, salonId, invoiceId } = body

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Stripe amounts are in the smallest currency unit (cents for USD)
    const amountInCents = Math.round(amount * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      description: description ?? 'Salon payment',
      metadata: {
        ...(salonId ? { salonId } : {}),
        ...(invoiceId ? { invoiceId } : {}),
      },
    })

    return Response.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[stripe/checkout] error creating PaymentIntent:', err)
    return Response.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
