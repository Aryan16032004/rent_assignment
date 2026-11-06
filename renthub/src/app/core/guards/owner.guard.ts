import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ListingService } from '../services/listing.service';

export const ownerGuard: CanActivateFn = (route) => {
  const listingService = inject(ListingService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const listingId = route.paramMap.get('id');

  if (!listingId) {
    return router.createUrlTree(['/']);
  }

  const currentUser = authService.currentUser();
  if (!currentUser) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: `/listings/${listingId}/edit` }
    });
  }

  return listingService.getById(listingId).pipe(
    catchError(() => of(null)),
    map((listing) => {
      if (!listing) {
        return router.createUrlTree(['/']);
      }

      return listing.ownerId === currentUser.id ? true : router.createUrlTree(['/']);
    })
  );
};
