export type UserRole = 'landlord' | 'renter' | 'both';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}
