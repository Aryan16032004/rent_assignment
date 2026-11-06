import { Amenity, LeaseType, Listing, PropertyType, VegetarianPreference } from './listing.model';

export type ListingSortOption =
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'area-asc'
  | 'area-desc'
  | 'favourited'
  | 'most-favourited';

export type HomeSortOption = ListingSortOption;
export type BooleanFilter = 'all' | 'yes' | 'no';
export type VegetarianFilter = 'all' | 'yes' | 'no' | 'no-preference';

export interface ListingFilterCriteria {
  searchTerm?: string;
  city?: string;
  propertyType?: PropertyType | 'all';
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  leaseType?: LeaseType | 'all';
  furnished?: 'all' | 'yes' | 'no';
  vegetarianPreference?: VegetarianPreference | 'all';
  amenities?: Amenity[];
}

export interface ListingQueryParams extends ListingFilterCriteria {
  page?: number;
  pageSize?: number;
  sort?: ListingSortOption;
}

export interface PagedResult<T = Listing> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListingFilters {
  search: string;
  city: string;
  propertyType: PropertyType | 'all';
  minRent: number;
  maxRent: number;
  bedrooms: number | null;
  leaseType: LeaseType | 'all';
  furnished: BooleanFilter;
  vegetarian: VegetarianFilter;
  amenities: Amenity[];
}

export interface ListingQuery {
  filters: ListingFilters;
  sort: HomeSortOption;
  pageIndex: number;
  pageSize: number;
}

export interface ListingPageResult {
  items: Listing[];
  total: number;
}
