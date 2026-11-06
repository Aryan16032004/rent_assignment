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
import { MatIconModule } from '@angular/material/icon';
import { Listing } from '../../../../core/models/listing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FavouriteService } from '../../../../core/services/favourite.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';

@Component({
  selector: 'app-featured-carousel',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    TruncatePipe
  ],
  templateUrl: './featured-carousel.component.html',
  styleUrl: './featured-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturedCarouselComponent {
  private readonly authService = inject(AuthService);
  private readonly favouriteService = inject(FavouriteService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = input<Listing[]>([]);
  readonly favouriteToggled = output<{ listingId: string; isFavourite: boolean }>();

  readonly activeIndex = signal(0);
  readonly isHovered = signal(false);

  private autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private touchStartX = 0;

  readonly activeListing = computed<Listing | null>(() => {
    const list = this.items();
    if (!list || list.length === 0) return null;
    const idx = Math.min(this.activeIndex(), list.length - 1);
    return list[idx] ?? null;
  });

  readonly isFav = computed(() => {
    const user = this.authService.currentUser();
    const l = this.activeListing();
    if (!l) return false;
    return this.favouriteService.isFavourite(user?.id, l.id);
  });

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  nextSlide(): void {
    const total = this.items().length;
    if (total === 0) return;
    this.activeIndex.update((current) => (current + 1) % total);
  }

  prevSlide(): void {
    const total = this.items().length;
    if (total === 0) return;
    this.activeIndex.update((current) => (current - 1 + total) % total);
  }

  goToSlide(index: number): void {
    this.activeIndex.set(index);
  }

  onMouseEnter(): void {
    this.isHovered.set(true);
    this.stopAutoplay();
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
    this.startAutoplay();
  }

  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
    this.stopAutoplay();
  }

  onTouchEnd(e: TouchEvent): void {
    const diff = this.touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
    this.startAutoplay();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') {
      this.nextSlide();
    } else if (e.key === 'ArrowLeft') {
      this.prevSlide();
    }
  }

  toggleFavourite(): void {
    const user = this.authService.currentUser();
    if (!user) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const listing = this.activeListing();
    if (!listing) return;

    this.favouriteService
      .toggleFavourite(user.id, listing.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isNowFav) => {
          this.toastService.success(
            isNowFav ? 'Added to favourites!' : 'Removed from favourites.'
          );
          this.favouriteToggled.emit({ listingId: listing.id, isFavourite: isNowFav });
        }
      });
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      this.nextSlide();
    }, 4500);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
}
