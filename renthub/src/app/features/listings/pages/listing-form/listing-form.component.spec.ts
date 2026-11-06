import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth.service';
import { ListingDraftService } from '../../../../core/services/listing-draft.service';
import { ListingService } from '../../../../core/services/listing.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ListingFormComponent } from './listing-form.component';

describe('ListingFormComponent', () => {
  const authServiceMock = {
    currentUser: vi.fn().mockReturnValue({ id: 'u-1', name: 'Landlord', email: 'landlord@renthub.com' })
  };

  const listingServiceMock = {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  };

  const draftServiceMock = {
    draft: vi.fn().mockReturnValue(null),
    saveDraft: vi.fn(),
    clearDraft: vi.fn()
  };

  const toastServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const routerMock = {
    navigate: vi.fn().mockResolvedValue(true)
  };

  beforeEach(async () => {
    authServiceMock.currentUser.mockReturnValue({ id: 'u-1', name: 'Landlord', email: 'landlord@renthub.com' });
    listingServiceMock.getById.mockReset();
    listingServiceMock.create.mockReset();
    listingServiceMock.update.mockReset();
    draftServiceMock.draft.mockReturnValue(null);
    toastServiceMock.success.mockReset();
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [ListingFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ListingService, useValue: listingServiceMock },
        { provide: ListingDraftService, useValue: draftServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } }
        }
      ]
    }).compileComponents();
  });

  it('initializes with default values and contact prefilled from logged-in user', () => {
    const fixture = TestBed.createComponent(ListingFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.form.controls.contact.controls.name.value).toBe('Landlord');
    expect(component.form.controls.contact.controls.email.value).toBe('landlord@renthub.com');
  });

  it('detects unsaved changes only when form is dirty', () => {
    const fixture = TestBed.createComponent(ListingFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.hasUnsavedChanges()).toBe(false);

    component.form.controls.title.setValue('My New Listing');
    component.form.controls.title.markAsDirty();
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('requires at least one photo before allowing submission', () => {
    const fixture = TestBed.createComponent(ListingFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.photos.set([]);
    component.submit();

    expect(component.photoError()).toContain('Please upload at least 1 photo.');
    expect(listingServiceMock.create).not.toHaveBeenCalled();
  });
});
