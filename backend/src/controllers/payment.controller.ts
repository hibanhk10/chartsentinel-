// ──────────────────────────────────────────────────────────────────────────────
// Stripe payments — TEMPORARILY DISABLED
// ──────────────────────────────────────────────────────────────────────────────
// All endpoints return 503. The env scaffolding (PAYMENTS_ENABLED,
// STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO,
// STRIPE_PRICE_ULTIMATE) is already documented in src/config/env.ts so
// when credentials land we just flip them on without another schema
// change.
//
// Activation checklist when ready:
//   1. Create Pro / Ultimate Price objects in the Stripe dashboard
//      (subscription mode is what the wired-but-disabled implementation
//      below assumes).
//   2. Set in Railway env:
//        STRIPE_SECRET_KEY        sk_live_… or sk_test_…
//        STRIPE_WEBHOOK_SECRET    whsec_… from the webhook endpoint
//        STRIPE_PRICE_PRO         price_…
//        STRIPE_PRICE_ULTIMATE    price_…
//        PAYMENTS_ENABLED         true
//   3. Set the webhook endpoint in Stripe to:
//        POST {API_URL}/api/payments/webhook
//      with events: checkout.session.completed,
//      customer.subscription.deleted.
//   4. Restore the original implementation by uncommenting the body
//      below, then set VITE_STRIPE_PUBLIC_KEY in the frontend env and
//      uncomment the Stripe branch in
//      chartsentinel/src/pages/SalesFunnelPage.jsx (search for
//      STRIPE-INTEGRATION).
// ──────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
// import Stripe from 'stripe';
// import env from '../config/env';
// import prisma from '../config/db';

export const createCheckoutSession = async (_req: Request, res: Response) => {
    // DISABLED: Stripe checkout is not yet configured.
    res.status(503).json({
        error: 'Payments are temporarily disabled. Get in touch if you want early access.',
    });
};

export const handleWebhook = async (_req: Request, res: Response) => {
    // DISABLED: Stripe webhook is not yet active.
    res.status(503).json({
        error: 'Stripe webhook is not yet configured.',
    });
};

/* ── Original implementation — restore when Stripe credentials land ──────────

interface AuthedRequest extends Request {
    user?: { id: string; email: string; role: string };
}

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripeClient) {
        if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
        stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-09-30.clover' });
    }
    return stripeClient;
}

const PLANS = {
    pro: () => env.STRIPE_PRICE_PRO,
    ultimate: () => env.STRIPE_PRICE_ULTIMATE,
} as const;
type Plan = keyof typeof PLANS;

export const createCheckoutSession = async (req: AuthedRequest, res: Response) => {
    if (!env.PAYMENTS_ENABLED) {
        return res.status(503).json({
            error: 'Payments are temporarily disabled. Get in touch if you want early access.',
        });
    }
    try {
        const { plan } = req.body as { plan?: string };
        if (!plan || !(plan in PLANS)) return res.status(400).json({ error: 'Invalid plan.' });
        const priceId = PLANS[plan as Plan]();
        if (!priceId) return res.status(500).json({ error: `STRIPE_PRICE_${plan.toUpperCase()} is not configured.` });

        const userId = req.user?.id;
        const email = req.user?.email;

        const session = await getStripe().checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${env.FRONTEND_URL ?? ''}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${env.FRONTEND_URL ?? ''}/funnel`,
            customer_email: email,
            client_reference_id: userId,
            metadata: { userId: userId ?? 'anonymous', plan },
        });
        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: 'Could not start checkout. Try again later.' });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    if (!env.PAYMENTS_ENABLED) return res.status(503).end();
    const sig = req.headers['stripe-signature'];
    if (!sig || !env.STRIPE_WEBHOOK_SECRET) return res.status(400).send('Missing signature or secret');

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(req.body, sig as string, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        console.error('Webhook signature failed:', message);
        return res.status(400).send(`Webhook Error: ${message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId || session.client_reference_id;
                if (userId && userId !== 'anonymous') {
                    await prisma.user.update({ where: { id: userId }, data: { isPaid: true } });
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customer = await getStripe().customers.retrieve(subscription.customer as string);
                if ('email' in customer && customer.email) {
                    await prisma.user.updateMany({ where: { email: customer.email }, data: { isPaid: false } });
                }
                break;
            }
        }
    } catch (err) {
        console.error('[stripe] handler error:', err);
    }
    res.json({ received: true });
};

──────────────────────────────────────────────────────────────────────────── */
