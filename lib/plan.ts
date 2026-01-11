import type { Plan } from './limits';

export function resolvePlan(subscription: any): Plan {
  if (!subscription) {
    return 'free';
  }
  if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
    return 'premium';
  }
  return 'free';
}
