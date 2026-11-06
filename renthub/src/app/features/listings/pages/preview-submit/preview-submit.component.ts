import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Listing } from '../../../../core/models/listing.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ListingDraftService } from '../../../../core/services/listing-draft.service';
import { ListingService } from '../../../../core/services/listing.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-preview-submit',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './preview-submit.component.html',
  styleUrl: './preview-submit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreviewSubmitComponent {
  private readonly draftService = inject(ListingDraftService);
  private readonly listingService = inject(ListingService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly draft = computed(() => this.draftService.draft());
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    if (!this.draft()) {
      void this.router.navigate(['/listings/new']);
    }
  }

  backToEdit(): void {
    void this.router.navigate(['/listings/new']);
  }

  submitListing(): void {
    const currentDraft = this.draft();
    const user = this.authService.currentUser();

    if (!currentDraft || !user) {
      return;
    }

    this.isSubmitting.set(true);

    const fullListing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'> = {
      ...(currentDraft as Required<Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>>),
      ownerId: user.id,
      ownerName: user.name,
      featured: false
    };

    this.listingService
      .create(fullListing)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.toastService.success('Listing submitted and published successfully!');
          this.draftService.clearDraft();
          void this.router.navigate(['/listings', created.id]);
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          this.toastService.error(
            err instanceof Error ? err.message : 'Failed to publish listing.'
          );
        }
      });
  }
}
