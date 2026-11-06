import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { AMENITIES } from '../../../../core/constants/amenities';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import {
  Amenity,
  LeaseType,
  Listing,
  ListingStatus,
  PriceMode,
  PropertyType,
  VegetarianPreference
} from '../../../../core/models/listing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ListingDraftService } from '../../../../core/services/listing-draft.service';
import { ListingService } from '../../../../core/services/listing.service';
import { ToastService } from '../../../../core/services/toast.service';
import { phoneValidator } from '../../../../shared/validators/phone.validator';

@Component({
  selector: 'app-listing-form',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './listing-form.component.html',
  styleUrl: './listing-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListingFormComponent implements HasUnsavedChanges {
  private readonly listingService = inject(ListingService);
  private readonly draftService = inject(ListingDraftService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = inject(ElementRef);

  readonly id = input<string, string | undefined>('', {
    transform: (val: string | undefined) => val ?? ''
  });

  readonly isEditMode = computed(() => !!this.id());
  readonly isSubmitted = signal(false);
  readonly isSaving = signal(false);
  readonly photos = signal<string[]>([]);
  readonly photoError = signal<string | null>(null);

  readonly allAmenities = AMENITIES;
  readonly propertyTypes: PropertyType[] = ['Apartment', 'Building', 'Independent House', 'Room'];

  // Amenities form group
  readonly amenitiesFormGroup = new FormGroup(
    this.allAmenities.reduce(
      (acc, amenity) => {
        acc[amenity] = new FormControl(false, { nonNullable: true });
        return acc;
      },
      {} as Record<Amenity, FormControl<boolean>>
    )
  );

  readonly form = new FormGroup({
    propertyType: new FormControl<PropertyType>('Apartment', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    buildingName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
    }),
    isShared: new FormControl<boolean>(false, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    address: new FormGroup({
      street: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(3)]
      }),
      city: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      state: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      zip: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^\d{5,6}$/)]
      })
    }),
    squareFeet: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(50), Validators.max(100000)]
    }),
    bedrooms: new FormControl<number>(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(20)]
    }),
    leaseType: new FormControl<LeaseType>('long-term', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    expectedRent: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(10000000)]
    }),
    negotiable: new FormControl<boolean>(false, { nonNullable: true }),
    priceMode: new FormControl<PriceMode>('per-month', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    furnished: new FormControl<boolean>(false, {
      nonNullable: true,
      validators: [Validators.required]
    }),
    vegetarianOnly: new FormControl<VegetarianPreference>('no-preference', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    status: new FormControl<ListingStatus>('published', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    amenities: this.amenitiesFormGroup,
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)]
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(30), Validators.maxLength(1400)]
    }),
    contact: new FormGroup({
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      phone: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, phoneValidator()]
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email]
      })
    })
  });

  readonly descCharCount = signal(0);

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.isSubmitted();
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user && !this.isEditMode()) {
      this.form.controls.contact.patchValue({
        name: user.name,
        email: user.email
      });
    }

    this.form.controls.description.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        this.descCharCount.set(val?.length ?? 0);
      });

    // If edit mode, load existing listing
    const listingId = this.id();
    if (listingId) {
      this.listingService
        .getById(listingId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((listing) => {
          if (listing) {
            this.prefillForm(listing);
          }
        });
    } else {
      // Check for saved draft
      const draft = this.draftService.draft();
      if (draft) {
        this.prefillFromDraft(draft);
      }
    }
  }

  async onFilesSelected(event: Event): Promise<void> {
    this.photoError.set(null);
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    const current = this.photos();

    if (current.length + files.length > 6) {
      this.photoError.set('You can upload a maximum of 6 photos.');
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      // Size limit: 2MB
      if (file.size > 2 * 1024 * 1024) {
        this.photoError.set(`"${file.name}" exceeds the 2MB size limit.`);
        return;
      }

      // Format check
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        this.photoError.set(`"${file.name}" is not a supported format (JPG, PNG, WEBP).`);
        return;
      }

      validFiles.push(file);
    }

    for (const file of validFiles) {
      try {
        const downscaled = await this.downscalePhoto(file);
        this.photos.update((list) => [...list, downscaled]);
        this.form.markAsDirty();
      } catch {
        this.photoError.set(`Could not process "${file.name}".`);
      }
    }

    input.value = '';
  }

  private downscalePhoto(file: File, maxDim = 1200, quality = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve('');
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (typeof window === 'undefined' || typeof Image === 'undefined') {
          resolve(dataUrl);
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(dataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch {
            resolve(dataUrl);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  removePhoto(index: number): void {
    this.photos.update((list) => list.filter((_, i) => i !== index));
    this.form.markAsDirty();
  }

  preview(): void {
    if (!this.validateForm()) {
      return;
    }

    const draft = this.buildListingPayload();
    const saved = this.draftService.saveDraft(draft);
    if (!saved) {
      this.toastService.error('Failed to save draft. Storage quota may be exceeded.');
    }
    this.isSubmitted.set(true); // Don't trigger unsaved changes when going to preview
    void this.router.navigate(['/listings/preview']);
  }

  submit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving.set(true);
    const payload = this.buildListingPayload();
    const currentUser = this.authService.currentUser()!;

    if (this.isEditMode()) {
      this.listingService
        .update(this.id(), payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.toastService.success('Listing updated successfully!');
            this.draftService.clearDraft();
            this.isSubmitted.set(true);
            void this.router.navigate(['/listings', updated.id]);
          },
          error: (err: unknown) => {
            this.isSaving.set(false);
            this.toastService.error(
              err instanceof Error ? err.message : 'Failed to update listing'
            );
          }
        });
    } else {
      const fullListing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'> = {
        ...payload,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        featured: false
      };

      this.listingService
        .create(fullListing)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.toastService.success('Listing published successfully!');
            this.draftService.clearDraft();
            this.isSubmitted.set(true);
            void this.router.navigate(['/listings', created.id]);
          },
          error: (err: unknown) => {
            this.isSaving.set(false);
            this.toastService.error(
              err instanceof Error ? err.message : 'Failed to publish listing'
            );
          }
        });
    }
  }

  cancel(): void {
    this.draftService.clearDraft();
    void this.router.navigate(['/my-listings']);
  }

  private validateForm(): boolean {
    this.photoError.set(null);

    if (this.photos().length === 0) {
      this.photoError.set('Please upload at least 1 photo.');
    }

    if (this.form.invalid || this.photos().length === 0) {
      this.form.markAllAsTouched();
      this.scrollToFirstInvalid();
      return false;
    }

    return true;
  }

  private scrollToFirstInvalid(): void {
    setTimeout(() => {
      const invalidControl = this.el.nativeElement.querySelector(
        '.ng-invalid:not(form):not(div)'
      ) as HTMLElement;
      if (invalidControl) {
        if (typeof invalidControl.scrollIntoView === 'function') {
          invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (typeof invalidControl.focus === 'function') {
          invalidControl.focus();
        }
      }
    }, 100);
  }

  private buildListingPayload(): Omit<Listing, 'id' | 'ownerId' | 'ownerName' | 'featured' | 'createdAt' | 'updatedAt'> {
    const val = this.form.getRawValue();

    // Collect selected amenities
    const selectedAmenities: Amenity[] = [];
    for (const amenity of this.allAmenities) {
      if (val.amenities[amenity]) {
        selectedAmenities.push(amenity);
      }
    }

    return {
      propertyType: val.propertyType,
      buildingName: val.buildingName.trim(),
      isShared: val.isShared,
      address: {
        street: val.address.street.trim(),
        city: val.address.city.trim(),
        state: val.address.state.trim(),
        zip: val.address.zip.trim()
      },
      squareFeet: Number(val.squareFeet),
      bedrooms: Number(val.bedrooms),
      leaseType: val.leaseType,
      expectedRent: Number(val.expectedRent),
      negotiable: val.negotiable,
      priceMode: val.priceMode,
      furnished: val.furnished,
      vegetarianOnly: val.vegetarianOnly,
      status: val.status,
      amenities: selectedAmenities,
      title: val.title.trim(),
      description: val.description.trim(),
      photos: this.photos(),
      contact: {
        name: val.contact.name.trim(),
        phone: val.contact.phone.trim(),
        email: val.contact.email.trim()
      }
    };
  }

  private prefillForm(listing: Listing): void {
    this.photos.set([...listing.photos]);

    const amenityValues: Record<string, boolean> = {};
    for (const a of this.allAmenities) {
      amenityValues[a] = listing.amenities.includes(a);
    }

    this.form.patchValue({
      propertyType: listing.propertyType,
      buildingName: listing.buildingName,
      isShared: listing.isShared,
      address: {
        street: listing.address.street,
        city: listing.address.city,
        state: listing.address.state,
        zip: listing.address.zip
      },
      squareFeet: listing.squareFeet,
      bedrooms: listing.bedrooms,
      leaseType: listing.leaseType,
      expectedRent: listing.expectedRent,
      negotiable: listing.negotiable,
      priceMode: listing.priceMode,
      furnished: listing.furnished,
      vegetarianOnly: listing.vegetarianOnly,
      status: listing.status ?? 'published',
      title: listing.title,
      description: listing.description,
      contact: {
        name: listing.contact.name,
        phone: listing.contact.phone,
        email: listing.contact.email
      }
    });

    this.amenitiesFormGroup.patchValue(amenityValues);
    this.descCharCount.set(listing.description.length);
  }

  private prefillFromDraft(draft: Partial<Listing>): void {
    if (draft.photos) {
      this.photos.set([...draft.photos]);
    }

    if (draft.amenities) {
      const amenityValues: Record<string, boolean> = {};
      for (const a of this.allAmenities) {
        amenityValues[a] = draft.amenities.includes(a);
      }
      this.amenitiesFormGroup.patchValue(amenityValues);
    }

    this.form.patchValue({
      propertyType: draft.propertyType ?? 'Apartment',
      buildingName: draft.buildingName ?? '',
      isShared: draft.isShared ?? false,
      address: draft.address ?? { street: '', city: '', state: '', zip: '' },
      squareFeet: draft.squareFeet ?? null,
      bedrooms: draft.bedrooms ?? 1,
      leaseType: draft.leaseType ?? 'long-term',
      expectedRent: draft.expectedRent ?? null,
      negotiable: draft.negotiable ?? false,
      priceMode: draft.priceMode ?? 'per-month',
      furnished: draft.furnished ?? false,
      vegetarianOnly: draft.vegetarianOnly ?? 'no-preference',
      status: draft.status ?? 'published',
      title: draft.title ?? '',
      description: draft.description ?? '',
      contact: draft.contact ?? { name: '', phone: '', email: '' }
    });

    if (draft.description) {
      this.descCharCount.set(draft.description.length);
    }
  }
}
