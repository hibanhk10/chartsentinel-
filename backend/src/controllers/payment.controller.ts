// ──────────────────────────────────────────────────────────────────────────────
// Stripe payments — TEMPORARILY DISABLED
// ──────────────────────────────────────────────────────────────────────────────
// The Stripe integration below is ready to go but intentionally commented
// out until payment requirements (price IDs, subscription vs one-time,
// webhook endpoint, success/cancel flow) are finalized.
//
// To re-enable:
//   1. Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in the backend env
//   2. Set VITE_STRIPE_PUBLIC_KEY in the frontend env
//   3. Uncomment the original body of createCheckoutSession + handleWebhook
//      below, and remove the "DISABLED" stub responses above each function
//   4. Uncomment the Stripe branch in chartsentinel/src/pages/SalesFunnelPage.jsx
//      (search for "STRIPE-INTEGRATION")
// ──────────────────────────────────────────────────────────────────────────────

import { Request, Response } from 'express';
// import Stripe from 'stripe';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
//     apiVersion: '2026-01-28.clover',
// });

export const createCheckoutSession = async (_req: Request, res: Response) => {
    // DISABLED: Stripe checkout is not yet configured.
    return res.status(503).json({
        error: 'Payments are temporarily disabled while Stripe is being configured.',
    });

    /* ── Original implementation — restore when Stripe is ready ─────────────
    try {
        const { plan, userId, email } = req.body;

        if (!userId || !plan) {
            return res.status(400).json({ error: 'Missing userId or plan' });
        }

        let amount;

        // Map plans to prices/amounts
        // In production, these should be Price IDs from your Stripe Dashboard
        if (plan === 'pro') {
            amount = 5900; // $59.00
            // priceId = 'price_pro_id';
        } else if (plan === 'ultimate') {
            amount = 10900; // $109.00
            // priceId = 'price_ultimate_id';
        } else {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `ChartSentinel ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // or 'subscription' if using recurring
            success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/funnel`,
            customer_email: email,
            metadata: {
                userId,
                plan,
            },
        });

        return res.json({ id: session.id });
    } catch (error: any) {
        console.error('Stripe error:', error);
        return res.status(500).json({ error: error.message });
    }
    ─────────────────────────────────────────────────────────────────────── */
};

export const handleWebhook = async (_req: Request, res: Response) => {
    // DISABLED: Stripe webhook is not yet active.
    return res.status(503).json({
        error: 'Stripe webhook is not yet configured.',
    });

    /* ── Original implementation — restore when Stripe is ready ─────────────
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (!sig || !endpointSecret) throw new Error('Missing signature or secret');
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            handleCheckoutSessionCompleted(session);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return res.send();
    ─────────────────────────────────────────────────────────────────────── */
};

/* ── Fulfillment helper — restore alongside handleWebhook ───────────────────
const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session) => {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;

    if (userId) {
        console.log(`Payment successful for user ${userId} on plan ${plan}`);
        // TODO: Update user in database
        // await prisma.user.update({
        //   where: { id: userId },
        //   data: { isPaid: true, plan: plan }
        // });
    }
};
─────────────────────────────────────────────────────────────────────────── */
