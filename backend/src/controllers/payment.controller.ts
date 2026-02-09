import { Request, Response } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16', // Use latest API version or pins
});

export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const { plan, userId, email } = req.body;

        if (!userId || !plan) {
            return res.status(400).json({ error: 'Missing userId or plan' });
        }

        let priceId;
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

        res.json({ id: session.id });
    } catch (error: any) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
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

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            // Fulfill the purchase...
            handleCheckoutSessionCompleted(session);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
};

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
