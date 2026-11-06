import type { PublicUser, UserRow } from '../types.js';

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at
  };
}
