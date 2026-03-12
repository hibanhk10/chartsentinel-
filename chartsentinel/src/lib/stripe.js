import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual publishable key
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : Promise.resolve(null);

export default stripePromise;
