export type UserRole = 'renter' | 'landlord' | 'both';
export type ListingStatus = 'draft' | 'pending' | 'published' | 'rented' | 'inactive';
export type InquiryStatus = 'pending' | 'accepted' | 'rejected' | 'closed';

export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
