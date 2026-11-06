import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Listing } from '../../../../core/models/listing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FavouriteService } from '../../../../core/services/favourite.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ListingCardComponent } from './listing-card.component';

describe('ListingCardComponent', () => {
  const dummyListing: Listing = {
    id: 'listing-1',
    ownerId: 'owner-1',
    ownerName: 'Owner One',
    propertyType: 'Apartment',
    buildingName: 'Skyline',
    isShared: false,
    address: { street: '123 Main St', city: 'Bengaluru', state: 'Karnataka', zip: '560001' },
    squareFeet: 850,
    bedrooms: 2,
    leaseType: 'long-term',
    expectedRent: 25000,
    negotiable: true,
    priceMode: 'per-month',
    furnished: true,
    vegetarianOnly: 'no-preference',
    amenities: ['Gym/Fitness Center', 'Swimming Pool'],
    title: 'Luxury 2BHK in Skyline',
    description: 'A beautiful luxury apartment with great views.',
    photos: ['https://example.com/photo.jpg'],
    contact: { name: 'Owner One', phone: '+91-9876543210', email: 'owner@example.com' },
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const authServiceMock = {
    currentUser: vi.fn()
  };

  const favouriteServiceMock = {
    isFavourite: vi.fn(),
    toggleFavourite: vi.fn()
  };

  const toastServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  beforeEach(async () => {
    authServiceMock.currentUser.mockReset();
    favouriteServiceMock.isFavourite.mockReset();
    favouriteServiceMock.toggleFavourite.mockReset();
    toastServiceMock.success.mockReset();

    await TestBed.configureTestingModule({
      imports: [ListingCardComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: FavouriteService, useValue: favouriteServiceMock },
        { provide: ToastService, useValue: toastServiceMock }
      ]
    }).compileComponents();
  });

  it('renders listing title, location, price and bedrooms', () => {
    const fixture = TestBed.createComponent(ListingCardComponent);
    fixture.componentRef.setInput('listing', dummyListing);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Luxury 2BHK in Skyline');
    expect(compiled.textContent).toContain('Bengaluru, Karnataka');
    expect(compiled.textContent).toContain('2 Bed');
    expect(compiled.textContent).toContain('Negotiable');
  });

  it('redirects to login when unauthenticated user clicks favourite', () => {
    authServiceMock.currentUser.mockReturnValue(null);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ListingCardComponent);
    fixture.componentRef.setInput('listing', dummyListing);
    fixture.detectChanges();

    const favButton = fixture.nativeElement.querySelector('.fav-btn') as HTMLButtonElement;
    favButton.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], expect.anything());
    expect(favouriteServiceMock.toggleFavourite).not.toHaveBeenCalled();
  });

  it('toggles favourite and emits event when authenticated user clicks favourite', () => {
    authServiceMock.currentUser.mockReturnValue({ id: 'user-1' });
    favouriteServiceMock.toggleFavourite.mockReturnValue(of(true));

    const fixture = TestBed.createComponent(ListingCardComponent);
    fixture.componentRef.setInput('listing', dummyListing);

    let emittedEvent: { listingId: string; isFavourite: boolean } | null = null;
    fixture.componentInstance.favouriteToggled.subscribe((e) => {
      emittedEvent = e;
    });

    fixture.detectChanges();

    const favButton = fixture.nativeElement.querySelector('.fav-btn') as HTMLButtonElement;
    favButton.click();

    expect(favouriteServiceMock.toggleFavourite).toHaveBeenCalledWith('user-1', 'listing-1');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Added to favourites!');
    expect(emittedEvent).toEqual({ listingId: 'listing-1', isFavourite: true });
  });

  it('falls back to default placeholder image on image load error', () => {
    const fixture = TestBed.createComponent(ListingCardComponent);
    fixture.componentRef.setInput('listing', dummyListing);
    fixture.detectChanges();

    fixture.componentInstance.onImageError();
    expect(fixture.componentInstance.currentImage()).toBe(fixture.componentInstance.fallbackImage);
  });
});
