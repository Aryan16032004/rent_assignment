import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ListingDraftService } from '../services/listing-draft.service';

/**
 * Functional Route Listing Draft Guard
 * Protects the Preview & Submit screen (`/listings/preview`).
 * Requires an active, populated listing draft in state.
 * If no draft exists, redirects back to the creation form (`/listings/new`).
 */
export const listingDraftGuard: CanActivateFn = () => {
  const listingDraftService = inject(ListingDraftService);
  const router = inject(Router);

  return listingDraftService.hasDraft() ? true : router.createUrlTree(['/listings/new']);
};
