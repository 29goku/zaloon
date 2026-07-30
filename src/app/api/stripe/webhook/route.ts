import { type NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.warn('[stripe/webhook] Stripe is not configured — ignoring webhook')
    return Response.json({ received: false, reason: 'stripe_not_configured' })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set — ignoring webhook')
    return Response.json({ received: false, reason: 'webhook_secret_not_configured' })
  }

  // Read raw body — webhook signature verification requires the raw bytes
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      const invoiceId = paymentIntent.metadata?.invoiceId

      if (invoiceId) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        })
        console.log(`[stripe/webhook] Invoice ${invoiceId} marked as PAID`)
      } else {
        console.log('[stripe/webhook] payment_intent.succeeded — no invoiceId in metadata, skipping DB update')
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error('[stripe/webhook] error handling event:', err)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
