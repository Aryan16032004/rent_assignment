import { User } from './user.model';

export interface AuthSession {
  userId: string;
  token: string;
  user?: User;
}

export interface AuthResponse {
  user: User;
  token: string;
}
