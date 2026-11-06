export type PropertyType = 'Apartment' | 'Building' | 'Independent House' | 'Room';
export type LeaseType = 'long-term' | 'short-term' | 'both';
export type PriceMode = 'per-month' | 'utilities-included';
export type VegetarianPreference = 'yes' | 'no' | 'no-preference';
export type ListingStatus = 'draft' | 'pending' | 'published' | 'rented' | 'inactive';

export type Amenity =
  | 'Gym/Fitness Center'
  | 'Swimming Pool'
  | 'Car Park'
  | 'Visitors Parking'
  | 'Power Backup'
  | 'Garbage Disposal'
  | 'Private Lawn'
  | 'Water Heater'
  | 'Plant Security System'
  | 'Laundry Service'
  | 'Elevator'
  | 'Club House';

export interface ListingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ListingContact {
  name: string;
  phone: string;
  email: string;
}

export interface ListingImage {
  id?: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
}

export interface Listing {
  id: string;
  ownerId: string;
  ownerName: string;
  propertyType: PropertyType;
  buildingName: string;
  isShared: boolean;
  address: ListingAddress;
  squareFeet: number;
  bedrooms: number;
  leaseType: LeaseType;
  expectedRent: number;
  negotiable: boolean;
  priceMode: PriceMode;
  furnished: boolean;
  vegetarianOnly: VegetarianPreference;
  amenities: Amenity[];
  title: string;
  description: string;
  photos: string[];
  images?: ListingImage[];
  contact: ListingContact;
  featured: boolean;
  status?: ListingStatus;
  createdAt: string;
  updatedAt: string;
}
