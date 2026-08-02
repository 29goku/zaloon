'use server'

import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getCurrentSalonId } from '@/lib/repositories/base'

export interface BillingInvoice {
  id: string
  amount: number
  currency: string
  status: string
  date: string
  pdfUrl: string | null
}

export interface BillingInfo {
  plan: string
  amount: number
  currency: string
  nextBillingDate: string | null
  paymentMethodDisplay: string | null
  billingCycle: string
  invoices: BillingInvoice[]
  isMock: boolean
}

const MOCK_BILLING: BillingInfo = {
  plan: 'Professional Plan',
  amount: 49,
  currency: 'usd',
  nextBillingDate: 'Aug 1, 2026',
  paymentMethodDisplay: 'Visa ···· 4242',
  billingCycle: 'Monthly',
  invoices: [],
  isMock: true,
}

/**
 * Returns billing info for the current salon.
 *
 * If STRIPE_SECRET_KEY is not set (or the salon has no Stripe customer),
 * returns mock data so the existing UI keeps working.
 */
export async function getBillingInfo(): Promise<BillingInfo> {
  if (!stripe) {
    console.warn('[getBillingInfo] Stripe not configured — returning mock data')
    return MOCK_BILLING
  }

  try {
    // Look for stripeCustomerId in the salon's settings JSON field or a
    // dedicated column.  For now we store it in the `notificationPrefs` JSON
    // field under key "stripeCustomerId" until a proper migration adds the column.
    const salonId = await getCurrentSalonId()
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, notificationPrefs: true },
    })

    if (!salon) return MOCK_BILLING

    let stripeCustomerId: string | null = null
    if (salon.notificationPrefs) {
      try {
        const prefs = JSON.parse(salon.notificationPrefs) as Record<string, unknown>
        stripeCustomerId = typeof prefs.stripeCustomerId === 'string'
          ? prefs.stripeCustomerId
          : null
      } catch {
        // malformed JSON — ignore
      }
    }

    if (!stripeCustomerId) {
      // No Stripe customer linked — return mock so UI doesn't break
      return MOCK_BILLING
    }

    // Fetch subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
      status: 'active',
      expand: ['data.default_payment_method'],
    })

    const sub = subscriptions.data[0]
    if (!sub) return MOCK_BILLING

    const priceItem = sub.items.data[0]?.price
    const amount = (priceItem?.unit_amount ?? 4900) / 100
    const currency = priceItem?.currency ?? 'usd'
    const interval = priceItem?.recurring?.interval ?? 'month'
    const nextBillingDate = sub.billing_cycle_anchor
      ? new Date(sub.billing_cycle_anchor * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null

    // Payment method display
    let paymentMethodDisplay: string | null = null
    const pm = sub.default_payment_method
    if (pm && typeof pm !== 'string' && pm.card) {
      const brand = pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)
      paymentMethodDisplay = `${brand} ···· ${pm.card.last4}`
    }

    // Last 3 invoices
    const stripeInvoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 3,
    })

    const invoices: BillingInvoice[] = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      amount: (inv.amount_paid ?? 0) / 100,
      currency: inv.currency,
      status: inv.status ?? 'unknown',
      date: inv.created
        ? new Date(inv.created * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '',
      pdfUrl: inv.invoice_pdf ?? null,
    }))

    return {
      plan: 'Professional Plan',
      amount,
      currency,
      nextBillingDate,
      paymentMethodDisplay,
      billingCycle: interval.charAt(0).toUpperCase() + interval.slice(1) + 'ly',
      invoices,
      isMock: false,
    }
  } catch (err) {
    console.error('[getBillingInfo] Stripe error — falling back to mock data:', err)
    return MOCK_BILLING
  }
}
