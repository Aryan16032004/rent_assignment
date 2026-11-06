import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Landlord Guard
 * Restricts listing creation routes (`/listings/new`) to authorised users with roles 'landlord' or 'both'.
 * Redirects unauthenticated users to `/login` with `returnUrl`, and pure renters to `/dashboard`.
 */
export const landlordGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  // If visitor is unauthenticated, redirect to login
  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: '/listings/new' }
    });
  }

  // Permit users with hosting privileges
  if (user.role === 'landlord' || user.role === 'both') {
    return true;
  }

  // Pure renters are redirected to their dashboard
  return router.createUrlTree(['/dashboard']);
};
