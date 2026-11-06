import { resolveImageUrl } from '../config/api.config';
import { Listing } from '../models/listing.model';

export function normalizeListing(listing: Listing): Listing {
  return {
    ...listing,
    expectedRent: Number(listing.expectedRent),
    squareFeet: Number(listing.squareFeet),
    bedrooms: Number(listing.bedrooms),
    photos: (listing.photos ?? []).map(resolveImageUrl),
    images: listing.images?.map((image) => ({
      ...image,
      url: resolveImageUrl(image.url)
    }))
  };
}
