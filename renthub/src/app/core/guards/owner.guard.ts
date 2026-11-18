import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ListingService } from '../services/listing.service';

/**
 * Owner Guard
 * Ensures only the landlord who created the listing can access the edit page.
 */
export const ownerGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const listingService = inject(ListingService);
  const router = inject(Router);

  const listingId = route.paramMap.get('id');
  const user = authService.currentUser();

  if (!user || !listingId) {
    return router.createUrlTree(['/login']);
  }

  return listingService.getById(listingId).pipe(
    map((listing) => {
      if (listing && listing.ownerId === user.id) {
        return true;
      }
      return router.createUrlTree(['/']);
    })
  );
};
