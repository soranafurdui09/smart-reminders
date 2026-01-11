export type Plan = 'free' | 'premium';

export const planLimits = {
  free: { reminders: 5, members: 2 },
  premium: { reminders: Number.POSITIVE_INFINITY, members: 6 }
} satisfies Record<Plan, { reminders: number; members: number }>;

export function canAddReminder(plan: Plan, currentCount: number) {
  return currentCount < planLimits[plan].reminders;
}

export function canInviteMember(plan: Plan, currentCount: number) {
  return currentCount < planLimits[plan].members;
}
