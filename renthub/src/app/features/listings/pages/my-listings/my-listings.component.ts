import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Listing, ListingStatus } from '../../../../core/models/listing.model';
import { ListingService } from '../../../../core/services/listing.service';
import { ToastService } from '../../../../core/services/toast.service';

type StatusTab = 'all' | ListingStatus;

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './my-listings.component.html',
  styleUrl: './my-listings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyListingsComponent {
  private readonly listingService = inject(ListingService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly listings = signal<Listing[]>([]);
  readonly isLoading = signal(true);
  readonly activeTab = signal<StatusTab>('all');
  readonly tabs: { label: string; value: StatusTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Published', value: 'published' },
    { label: 'Draft', value: 'draft' },
    { label: 'Rented', value: 'rented' },
    { label: 'Inactive', value: 'inactive' }
  ];

  readonly filteredListings = computed(() => {
    const tab = this.activeTab();
    return tab === 'all' ? this.listings() : this.listings().filter((item) => item.status === tab);
  });

  readonly counts = computed(() => {
    const result: Record<string, number> = { all: this.listings().length };
    for (const listing of this.listings()) {
      const status = listing.status ?? 'published';
      result[status] = (result[status] ?? 0) + 1;
    }
    return result;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.listingService
      .getMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.listings.set(items);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
  }

  updateStatus(listing: Listing, status: ListingStatus): void {
    this.listingService
      .updateStatus(listing.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.listings.update((items) =>
            items.map((item) => (item.id === updated.id ? updated : item))
          );
          this.toastService.success(`Listing marked as ${status}.`);
        }
      });
  }

  deleteListing(listing: Listing): void {
    if (!window.confirm(`Delete "${listing.title}" permanently?`)) {
      return;
    }

    this.listingService
      .delete(listing.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.listings.update((items) => items.filter((item) => item.id !== listing.id));
          this.toastService.success('Listing deleted successfully.');
        }
      });
  }
}
