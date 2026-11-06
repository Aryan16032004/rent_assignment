import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Listing } from '../../../../core/models/listing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FavouriteService } from '../../../../core/services/favourite.service';
import { CommentService } from '../../../../core/services/comment.service';
import { ListingService } from '../../../../core/services/listing.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ListingDetailsComponent } from './listing-details.component';

describe('ListingDetailsComponent', () => {
  const dummyListing: Listing = {
    id: 'l-100',
    ownerId: 'owner-99',
    ownerName: 'Sunita Rao',
    propertyType: 'Apartment',
    buildingName: 'Lakeview Heights',
    isShared: false,
    address: { street: '45 Lake Rd', city: 'Bengaluru', state: 'KA', zip: '560002' },
    squareFeet: 1200,
    bedrooms: 3,
    leaseType: 'long-term',
    expectedRent: 42000,
    negotiable: false,
    priceMode: 'per-month',
    furnished: true,
    vegetarianOnly: 'no',
    amenities: ['Swimming Pool', 'Club House'],
    title: '3BHK Lakeview Luxury',
    description: 'Breathtaking lake view from the balcony with modern interiors.',
    photos: ['https://example.com/lake1.jpg', 'https://example.com/lake2.jpg'],
    contact: { name: 'Sunita Rao', phone: '+91-9876543210', email: 'sunita@example.com' },
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const listingServiceMock = {
    getById: vi.fn(),
    delete: vi.fn()
  };

  const favouriteServiceMock = {
    isFavourite: vi.fn(),
    toggleFavourite: vi.fn()
  };

  const authServiceMock = {
    currentUser: vi.fn()
  };

  const toastServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const commentServiceMock = {
    getForListing: vi.fn().mockReturnValue(of([])),
    add: vi.fn(),
    delete: vi.fn()
  };

  beforeEach(async () => {
    listingServiceMock.getById.mockReturnValue(of(dummyListing));
    favouriteServiceMock.isFavourite.mockReturnValue(false);
    authServiceMock.currentUser.mockReturnValue({ id: 'renter-1', name: 'Renter' });
    toastServiceMock.success.mockReset();

    await TestBed.configureTestingModule({
      imports: [ListingDetailsComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ListingService, useValue: listingServiceMock },
        { provide: FavouriteService, useValue: favouriteServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: CommentService, useValue: commentServiceMock }
      ]
    }).compileComponents();
  });

  it('renders listing specifications and description', () => {
    const fixture = TestBed.createComponent(ListingDetailsComponent);
    fixture.componentRef.setInput('id', 'l-100');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('3BHK Lakeview Luxury');
    expect(compiled.textContent).toContain('1200 sq ft');
    expect(compiled.textContent).toContain('3 Bed');
    expect(compiled.textContent).toContain('Swimming Pool');
  });

  it('toggles lightbox visibility', () => {
    const fixture = TestBed.createComponent(ListingDetailsComponent);
    fixture.componentRef.setInput('id', 'l-100');
    fixture.detectChanges();

    expect(fixture.componentInstance.isLightboxOpen()).toBe(false);

    fixture.componentInstance.openLightbox();
    expect(fixture.componentInstance.isLightboxOpen()).toBe(true);

    fixture.componentInstance.closeLightbox();
    expect(fixture.componentInstance.isLightboxOpen()).toBe(false);
  });

  it('shows owner actions only when current user is the owner', () => {
    authServiceMock.currentUser.mockReturnValue({ id: 'owner-99', name: 'Sunita Rao' });

    const fixture = TestBed.createComponent(ListingDetailsComponent);
    fixture.componentRef.setInput('id', 'l-100');
    fixture.detectChanges();

    expect(fixture.componentInstance.isOwner()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('You own this listing');
    expect(compiled.textContent).toContain('Edit Listing');
  });
});
