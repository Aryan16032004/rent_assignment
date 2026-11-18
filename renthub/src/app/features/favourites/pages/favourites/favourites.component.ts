import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Listing } from '../../../../core/models/listing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ListingCardComponent } from '../../../listings/components/listing-card/listing-card.component';
import { ListingService } from '../../../../core/services/listing.service';

@Component({
  selector: 'app-favourites',
  standalone: true,
  imports: [ListingCardComponent, MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './favourites.component.html',
  styleUrl: './favourites.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavouritesComponent {
  private readonly listingService = inject(ListingService);
  private readonly authService = inject(AuthService);

  readonly listings = signal<Listing[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.listings.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.listingService.getFavourites(user.id).subscribe({
      next: (items) => {
        this.listings.set(items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
