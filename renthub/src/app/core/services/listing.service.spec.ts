import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Listing } from '../models/listing.model';
import { ListingService } from './listing.service';

describe('ListingService', () => {
  let service: ListingService;
  let httpMock: HttpTestingController;

  const mockListing: Listing = {
    id: 'l-1',
    ownerId: 'owner-1',
    ownerName: 'Owner One',
    propertyType: 'Apartment',
    buildingName: 'Heights',
    isShared: false,
    address: { street: '1st Ave', city: 'Bengaluru', state: 'KA', zip: '560001' },
    squareFeet: 1000,
    bedrooms: 2,
    leaseType: 'long-term',
    expectedRent: 30000,
    negotiable: true,
    priceMode: 'per-month',
    furnished: true,
    vegetarianOnly: 'yes',
    amenities: ['Gym/Fitness Center', 'Power Backup'],
    title: 'Nice Apartment in Bengaluru',
    description: 'Spacious flat close to tech parks.',
    photos: ['/uploads/photo.jpg'],
    contact: { name: 'Owner One', phone: '1234567890', email: 'one@example.com' },
    featured: true,
    status: 'published',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ListingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends filters and pagination to the listings endpoint', async () => {
    const promise = firstValueFrom(
      service.queryListings({
        searchTerm: 'Bengaluru',
        minPrice: 20000,
        furnished: 'yes',
        page: 1,
        pageSize: 9,
        sort: 'price-asc'
      })
    );

    const request = httpMock.expectOne((req) => req.url.endsWith('/listings'));
    expect(request.request.params.get('q')).toBe('Bengaluru');
    expect(request.request.params.get('minPrice')).toBe('20000');
    expect(request.request.params.get('furnished')).toBe('yes');
    expect(request.request.params.get('sort')).toBe('price-asc');

    request.flush({ items: [mockListing], total: 1, page: 1, pageSize: 9, totalPages: 1 });
    const result = await promise;
    expect(result.items.length).toBe(1);
    expect(result.items[0].photos[0]).toContain('/uploads/photo.jpg');
  });

  it('normalizes relative image URLs returned by the API', async () => {
    const promise = firstValueFrom(service.getById('l-1'));

    const request = httpMock.expectOne('http://localhost:3000/api/listings/l-1');
    request.flush(mockListing);

    const result = await promise;
    expect(result?.photos[0]).toBe('http://localhost:3000/uploads/photo.jpg');
  });

  it('loads the authenticated user listings from /mine', async () => {
    const promise = firstValueFrom(service.getMine());

    const request = httpMock.expectOne('http://localhost:3000/api/listings/mine');
    request.flush([mockListing]);

    expect((await promise).length).toBe(1);
  });
});
