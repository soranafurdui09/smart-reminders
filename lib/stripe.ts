import Stripe from 'stripe';
import { getOptionalEnv } from './env';

export function getStripeClient() {
  const key = getOptionalEnv('STRIPE_SECRET_KEY');
  if (!key) {
    return null;
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export function getStripePricePremium() {
  return getOptionalEnv('STRIPE_PRICE_PREMIUM');
}

export function getStripeWebhookSecret() {
  return getOptionalEnv('STRIPE_WEBHOOK_SECRET');
}
