import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Authentication Guard
 * Protects authenticated routes (e.g., `/favourites`, `/inquiries`, `/profile`).
 * Redirects unauthenticated visitors to `/login` while preserving the intended target URL in `returnUrl`.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Allow access if user is logged in
  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirect to login preserving destination in query parameters
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
