import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Amenity, LeaseType, Listing, PropertyType, VegetarianPreference } from '../../../../core/models/listing.model';
import {
  ListingFilterCriteria,
  ListingQueryParams,
  ListingSortOption,
  PagedResult
} from '../../../../core/models/listing-query.model';
import { ListingService } from '../../../../core/services/listing.service';
import { FeaturedCarouselComponent } from '../../components/featured-carousel/featured-carousel.component';
import { ListingCardComponent } from '../../components/listing-card/listing-card.component';
import { ListingFiltersComponent } from '../../components/listing-filters/listing-filters.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FeaturedCarouselComponent,
    ListingCardComponent,
    ListingFiltersComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly listingService = inject(ListingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly featuredListings = signal<Listing[]>([]);
  readonly pagedResult = signal<PagedResult<Listing>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 9,
    totalPages: 1
  });
  readonly isLoading = signal(true);

  readonly currentSort = signal<ListingSortOption>('newest');
  readonly currentFilterCriteria = signal<ListingFilterCriteria>({});
  readonly currentPage = signal(1);
  readonly currentPageSize = signal(9);

  readonly sortOptions: { label: string; value: ListingSortOption }[] = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Area: Largest First', value: 'area-desc' },
    { label: 'Area: Smallest First', value: 'area-asc' },
    { label: 'Most Favourited', value: 'favourited' }
  ];

  ngOnInit(): void {
    this.loadFeatured();
    this.parseQueryParams();
    this.fetchListings();
  }

  loadFeatured(): void {
    this.listingService
      .getFeatured()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((featured) => {
        this.featuredListings.set(featured);
      });
  }

  onFiltersChanged(newFilters: ListingFilterCriteria): void {
    this.currentFilterCriteria.set(newFilters);
    this.currentPage.set(1);
    this.syncUrlParams();
    this.fetchListings();
    this.scrollToListings();
  }

  onSortChanged(sort: ListingSortOption): void {
    this.currentSort.set(sort);
    this.syncUrlParams();
    this.fetchListings();
    this.scrollToListings();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.currentPageSize.set(event.pageSize);
    this.syncUrlParams();
    this.fetchListings();
    this.scrollToListings();
  }

  scrollToListings(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      const el = document.getElementById('listings-section');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }, 50);
  }

  refreshListings(): void {
    this.fetchListings();
  }

  private fetchListings(): void {
    this.isLoading.set(true);
    const query: ListingQueryParams = {
      ...this.currentFilterCriteria(),
      page: this.currentPage(),
      pageSize: this.currentPageSize(),
      sort: this.currentSort()
    };

    this.listingService
      .queryListings(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.pagedResult.set(result);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
  }

  private parseQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;

    const searchTerm = params.get('q') ?? undefined;
    const city = params.get('city') ?? undefined;
    const propertyType = (params.get('propertyType') as PropertyType) ?? undefined;
    const minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : undefined;
    const maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined;
    const bedrooms = params.has('bedrooms') ? Number(params.get('bedrooms')) : undefined;
    const leaseType = (params.get('leaseType') as LeaseType) ?? undefined;
    const furnished = (params.get('furnished') as 'yes' | 'no') ?? undefined;
    const vegetarianPreference = (params.get('veg') as VegetarianPreference) ?? undefined;
    const amenities = params.has('amenities')
      ? (params.get('amenities')?.split(',') as Amenity[])
      : undefined;

    this.currentFilterCriteria.set({
      searchTerm,
      city,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      leaseType,
      furnished,
      vegetarianPreference,
      amenities
    });

    const sort = (params.get('sort') as ListingSortOption) ?? 'newest';
    this.currentSort.set(sort);

    const page = params.has('page') ? Number(params.get('page')) : 1;
    this.currentPage.set(page > 0 ? page : 1);

    const pageSize = params.has('pageSize') ? Number(params.get('pageSize')) : 9;
    this.currentPageSize.set(pageSize);
  }

  private syncUrlParams(): void {
    const f = this.currentFilterCriteria();
    const queryParams: Record<string, string | number | undefined | null> = {
      q: f.searchTerm || null,
      city: f.city || null,
      propertyType: f.propertyType && f.propertyType !== 'all' ? f.propertyType : null,
      minPrice: f.minPrice !== undefined ? f.minPrice : null,
      maxPrice: f.maxPrice !== undefined ? f.maxPrice : null,
      bedrooms: f.bedrooms !== undefined ? f.bedrooms : null,
      leaseType: f.leaseType || null,
      furnished: f.furnished || null,
      veg: f.vegetarianPreference || null,
      amenities: f.amenities && f.amenities.length > 0 ? f.amenities.join(',') : null,
      sort: this.currentSort() !== 'newest' ? this.currentSort() : null,
      page: this.currentPage() > 1 ? this.currentPage() : null,
      pageSize: this.currentPageSize() !== 9 ? this.currentPageSize() : null
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }
}
