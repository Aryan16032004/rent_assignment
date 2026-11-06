import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Listing } from '../../../../core/models/listing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ListingDraftService } from '../../../../core/services/listing-draft.service';
import { ListingService } from '../../../../core/services/listing.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PreviewSubmitComponent } from './preview-submit.component';

describe('PreviewSubmitComponent', () => {
  const dummyDraft: Partial<Listing> = {
    title: 'Draft Luxury Flat',
    propertyType: 'Apartment',
    buildingName: 'Emerald Towers',
    expectedRent: 35000,
    priceMode: 'per-month',
    negotiable: true,
    bedrooms: 2,
    squareFeet: 950,
    leaseType: 'long-term',
    furnished: true,
    vegetarianOnly: 'no-preference',
    amenities: ['Gym/Fitness Center', 'Swimming Pool'],
    description: 'A beautiful draft description for preview.',
    photos: ['https://example.com/draft1.jpg'],
    address: { street: '12 Emerald Way', city: 'Pune', state: 'MH', zip: '411001' },
    contact: { name: 'Owner', phone: '9876543210', email: 'owner@example.com' }
  };

  const draftServiceMock = {
    draft: vi.fn(),
    clearDraft: vi.fn()
  };

  const listingServiceMock = {
    create: vi.fn()
  };

  const authServiceMock = {
    currentUser: vi.fn().mockReturnValue({ id: 'u-1', name: 'Landlord' })
  };

  const toastServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true)
  };

  beforeEach(async () => {
    draftServiceMock.draft.mockReturnValue(dummyDraft);
    listingServiceMock.create.mockReset();
    toastServiceMock.success.mockReset();
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [PreviewSubmitComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ListingDraftService, useValue: draftServiceMock },
        { provide: ListingService, useValue: listingServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();
  });

  it('renders draft details properly', () => {
    const fixture = TestBed.createComponent(PreviewSubmitComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Draft Luxury Flat');
    expect(compiled.textContent).toContain('Pune, MH 411001');
    expect(compiled.textContent).toContain('Gym/Fitness Center');
  });

  it('navigates back to edit on button click', () => {
    const fixture = TestBed.createComponent(PreviewSubmitComponent);
    fixture.detectChanges();

    fixture.componentInstance.backToEdit();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/listings/new']);
  });

  it('submits listing, shows toast and navigates to details', () => {
    listingServiceMock.create.mockReturnValue(
      of({ ...dummyDraft, id: 'new-id-123' } as Listing)
    );

    const fixture = TestBed.createComponent(PreviewSubmitComponent);
    fixture.detectChanges();

    fixture.componentInstance.submitListing();

    expect(listingServiceMock.create).toHaveBeenCalled();
    expect(toastServiceMock.success).toHaveBeenCalledWith(
      'Listing submitted and published successfully!'
    );
    expect(draftServiceMock.clearDraft).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/listings', 'new-id-123']);
  });
});
