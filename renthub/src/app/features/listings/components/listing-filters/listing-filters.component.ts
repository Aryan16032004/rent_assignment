import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { AMENITIES } from '../../../../core/constants/amenities';
import { Amenity, LeaseType, PropertyType, VegetarianPreference } from '../../../../core/models/listing.model';
import { ListingFilterCriteria } from '../../../../core/models/listing-query.model';

@Component({
  selector: 'app-listing-filters',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './listing-filters.component.html',
  styleUrl: './listing-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListingFiltersComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly criteria = input<ListingFilterCriteria>({});
  readonly totalResults = input<number>(0);
  readonly filtersChanged = output<ListingFilterCriteria>();

  readonly allAmenities = AMENITIES;
  readonly isPanelExpanded = signal(false);

  readonly cities = [
    'All',
    'Bengaluru',
    'Mumbai',
    'Pune',
    'Hyderabad',
    'Delhi',
    'Noida',
    'Gurugram',
    'Chennai',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
    'Lucknow',
    'Indore',
    'Kochi',
    'Visakhapatnam'
  ];

  readonly filterForm = new FormGroup({
    searchTerm: new FormControl('', { nonNullable: true }),
    city: new FormControl('All', { nonNullable: true }),
    propertyType: new FormControl<PropertyType | 'all'>('all', { nonNullable: true }),
    minPrice: new FormControl<number | null>(null),
    maxPrice: new FormControl<number | null>(null),
    bedrooms: new FormControl<number | null>(null),
    leaseType: new FormControl<LeaseType | 'all'>('all', { nonNullable: true }),
    furnished: new FormControl<'all' | 'yes' | 'no'>('all', { nonNullable: true }),
    vegetarianPreference: new FormControl<VegetarianPreference | 'all'>('all', { nonNullable: true })
  });

  readonly selectedAmenities = signal<Amenity[]>([]);
  readonly formState = signal(this.filterForm.getRawValue());

  readonly activeFilterChips = computed<{ label: string; key: string }[]>(() => {
    const chips: { label: string; key: string }[] = [];
    const val = this.formState();

    if (val.searchTerm) {
      chips.push({ label: `"${val.searchTerm}"`, key: 'searchTerm' });
    }
    if (val.city && val.city !== 'All') {
      chips.push({ label: `City: ${val.city}`, key: 'city' });
    }
    if (val.propertyType && val.propertyType !== 'all') {
      chips.push({ label: val.propertyType, key: 'propertyType' });
    }
    if (val.minPrice !== null && val.minPrice !== undefined) {
      chips.push({ label: `Min ₹${val.minPrice}`, key: 'minPrice' });
    }
    if (val.maxPrice !== null && val.maxPrice !== undefined) {
      chips.push({ label: `Max ₹${val.maxPrice}`, key: 'maxPrice' });
    }
    if (val.bedrooms !== null && val.bedrooms !== undefined) {
      chips.push({ label: `${val.bedrooms} Beds`, key: 'bedrooms' });
    }
    if (val.leaseType && val.leaseType !== 'all') {
      chips.push({ label: `Lease: ${val.leaseType}`, key: 'leaseType' });
    }
    if (val.furnished && val.furnished !== 'all') {
      chips.push({ label: val.furnished === 'yes' ? 'Furnished' : 'Unfurnished', key: 'furnished' });
    }
    if (val.vegetarianPreference && val.vegetarianPreference !== 'all') {
      chips.push({
        label: val.vegetarianPreference === 'yes' ? 'Veg Only' : 'Non-Veg Allowed',
        key: 'vegetarianPreference'
      });
    }
    for (const amenity of this.selectedAmenities()) {
      chips.push({ label: amenity, key: `amenity:${amenity}` });
    }

    return chips;
  });

  private readonly criteriaEffect = effect(() => {
    const criteria = this.criteria();
    this.filterForm.patchValue(
      {
        searchTerm: criteria.searchTerm ?? '',
        city: criteria.city ?? 'All',
        propertyType: criteria.propertyType ?? 'all',
        minPrice: criteria.minPrice ?? null,
        maxPrice: criteria.maxPrice ?? null,
        bedrooms: criteria.bedrooms ?? null,
        leaseType: criteria.leaseType ?? 'all',
        furnished: criteria.furnished ?? 'all',
        vegetarianPreference: criteria.vegetarianPreference ?? 'all'
      },
      { emitEvent: false }
    );
    this.selectedAmenities.set([...(criteria.amenities ?? [])]);
    this.formState.set(this.filterForm.getRawValue());
  });

  ngOnInit(): void {
    const initial = this.criteria();
    if (initial) {
      this.filterForm.patchValue(
        {
          searchTerm: initial.searchTerm ?? '',
          city: initial.city ?? 'All',
          propertyType: initial.propertyType ?? 'all',
          minPrice: initial.minPrice ?? null,
          maxPrice: initial.maxPrice ?? null,
          bedrooms: initial.bedrooms ?? null,
          leaseType: initial.leaseType ?? 'all',
          furnished: initial.furnished ?? 'all',
          vegetarianPreference: initial.vegetarianPreference ?? 'all'
        },
        { emitEvent: false }
      );
      if (initial.amenities) {
        this.selectedAmenities.set([...initial.amenities]);
      }
    }

    // Debounced text search
    this.filterForm.controls.searchTerm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.formState.update((state) => ({ ...state, searchTerm: value }));
        this.emitFilters();
      });

    this.filterForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formState.set(this.filterForm.getRawValue());
        this.emitFilters();
      });
  }

  toggleAmenity(amenity: Amenity): void {
    const current = this.selectedAmenities();
    if (current.includes(amenity)) {
      this.selectedAmenities.set(current.filter((a) => a !== amenity));
    } else {
      this.selectedAmenities.set([...current, amenity]);
    }
    this.emitFilters();
  }

  isAmenitySelected(amenity: Amenity): boolean {
    return this.selectedAmenities().includes(amenity);
  }

  removeChip(chip: { label: string; key: string }): void {
    if (chip.key === 'searchTerm') {
      this.filterForm.controls.searchTerm.setValue('');
    } else if (chip.key === 'city') {
      this.filterForm.controls.city.setValue('All');
    } else if (chip.key === 'propertyType') {
      this.filterForm.controls.propertyType.setValue('all');
    } else if (chip.key === 'minPrice') {
      this.filterForm.controls.minPrice.setValue(null);
    } else if (chip.key === 'maxPrice') {
      this.filterForm.controls.maxPrice.setValue(null);
    } else if (chip.key === 'bedrooms') {
      this.filterForm.controls.bedrooms.setValue(null);
    } else if (chip.key === 'leaseType') {
      this.filterForm.controls.leaseType.setValue('all');
    } else if (chip.key === 'furnished') {
      this.filterForm.controls.furnished.setValue('all');
    } else if (chip.key === 'vegetarianPreference') {
      this.filterForm.controls.vegetarianPreference.setValue('all');
    } else if (chip.key.startsWith('amenity:')) {
      const amenityName = chip.key.replace('amenity:', '') as Amenity;
      this.selectedAmenities.set(this.selectedAmenities().filter((a) => a !== amenityName));
      this.emitFilters();
    }
  }

  clearAll(): void {
    this.filterForm.reset({
      searchTerm: '',
      city: 'All',
      propertyType: 'all',
      minPrice: null,
      maxPrice: null,
      bedrooms: null,
      leaseType: 'all',
      furnished: 'all',
      vegetarianPreference: 'all'
    });
    this.selectedAmenities.set([]);
    this.formState.set(this.filterForm.getRawValue());
    this.emitFilters();
  }

  toggleCollapse(): void {
    this.isPanelExpanded.update((val) => !val);
  }

  private emitFilters(): void {
    const val = this.filterForm.value;
    const result: ListingFilterCriteria = {
      searchTerm: val.searchTerm?.trim() || undefined,
      city: val.city && val.city !== 'All' ? val.city : undefined,
      propertyType: val.propertyType && val.propertyType !== 'all' ? val.propertyType : undefined,
      minPrice: val.minPrice !== null && val.minPrice !== undefined ? Number(val.minPrice) : undefined,
      maxPrice: val.maxPrice !== null && val.maxPrice !== undefined ? Number(val.maxPrice) : undefined,
      bedrooms: val.bedrooms !== null && val.bedrooms !== undefined ? Number(val.bedrooms) : undefined,
      leaseType: val.leaseType && val.leaseType !== 'all' ? val.leaseType : undefined,
      furnished: val.furnished && val.furnished !== 'all' ? val.furnished : undefined,
      vegetarianPreference:
        val.vegetarianPreference && val.vegetarianPreference !== 'all'
          ? val.vegetarianPreference
          : undefined,
      amenities: this.selectedAmenities().length > 0 ? this.selectedAmenities() : undefined
    };
    this.filtersChanged.emit(result);
  }
}
