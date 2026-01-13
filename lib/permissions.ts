export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export function canEditReminder(role: Role) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canActOnReminder(role: Role) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
}

export function canManageHousehold(role: Role) {
  return role === 'OWNER' || role === 'ADMIN';
}
