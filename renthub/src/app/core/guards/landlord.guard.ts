import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const landlordGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (!user) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: '/listings/new' }
    });
  }

  if (user.role === 'landlord' || user.role === 'both') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
