import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default stripePromise;
