import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guest Guard
 * Restricts access to guest-only routes (e.g., `/login`, `/register`).
 * Redirects already authenticated users to the home dashboard (`/`).
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Allow navigation only if visitor is not logged in
  if (!authService.isLoggedIn()) {
    return true;
  }

  // Redirect authenticated user to homepage
  return router.createUrlTree(['/']);
};
