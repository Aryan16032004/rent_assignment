import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { FavouriteService } from '../../../../core/services/favourite.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Listing } from '../../../../core/models/listing.model';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';

@Component({
  selector: 'app-listing-card',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    RouterLink,
    TruncatePipe
  ],
  templateUrl: './listing-card.component.html',
  styleUrl: './listing-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListingCardComponent {
  private readonly authService = inject(AuthService);
  private readonly favouriteService = inject(FavouriteService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly listing = input.required<Listing>();
  readonly favouriteToggled = output<{ listingId: string; isFavourite: boolean }>();

  readonly fallbackImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';
  readonly currentImage = signal<string>('');

  readonly isFav = computed(() => {
    const user = this.authService.currentUser();
    const l = this.listing();
    return this.favouriteService.isFavourite(user?.id, l.id);
  });

  ngOnInit(): void {
    const photos = this.listing().photos;
    this.currentImage.set(photos && photos.length > 0 ? photos[0] : this.fallbackImage);
  }

  onImageError(): void {
    this.currentImage.set(this.fallbackImage);
  }

  toggleFavourite(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const user = this.authService.currentUser();
    if (!user) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const listingId = this.listing().id;
    this.favouriteService
      .toggleFavourite(user.id, listingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isNowFav) => {
          this.toastService.success(
            isNowFav ? 'Added to favourites!' : 'Removed from favourites.'
          );
          this.favouriteToggled.emit({ listingId, isFavourite: isNowFav });
        }
      });
  }
}
