import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ListingDraftService } from '../services/listing-draft.service';

export const listingDraftGuard: CanActivateFn = () => {
  const listingDraftService = inject(ListingDraftService);
  const router = inject(Router);

  return listingDraftService.hasDraft() ? true : router.createUrlTree(['/listings/new']);
};
