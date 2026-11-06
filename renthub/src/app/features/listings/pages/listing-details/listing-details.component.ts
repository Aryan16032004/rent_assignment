import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Comment } from '../../../../core/models/comment.model';
import { Listing } from '../../../../core/models/listing.model';
import { CommentService } from '../../../../core/services/comment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FavouriteService } from '../../../../core/services/favourite.service';
import { ListingService } from '../../../../core/services/listing.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { InquiryDialogComponent } from '../../components/inquiry-dialog/inquiry-dialog.component';

@Component({
  selector: 'app-listing-details',
  standalone: true,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
    TimeAgoPipe
  ],
  templateUrl: './listing-details.component.html',
  styleUrl: './listing-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListingDetailsComponent {
  private readonly listingService = inject(ListingService);
  private readonly commentService = inject(CommentService);
  private readonly favouriteService = inject(FavouriteService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  readonly listing = signal<Listing | null>(null);
  readonly isLoading = signal(true);
  readonly activePhotoIndex = signal(0);
  readonly isLightboxOpen = signal(false);
  readonly comments = signal<Comment[]>([]);
  readonly replyTo = signal<Comment | null>(null);
  readonly isPostingComment = signal(false);
  readonly isLoggedIn = computed(() => !!this.authService.currentUser());
  readonly commentControl = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(500),
      (control) => {
        const val = control.value || '';
        return val.trim().length === 0 ? { whitespace: true } : null;
      }
    ]
  });

  readonly rootComments = computed(() => this.comments().filter((comment) => !comment.parentId));

  readonly isOwner = computed(() => {
    const user = this.authService.currentUser();
    const l = this.listing();
    return Boolean(user && l && user.id === l.ownerId);
  });

  readonly isFav = computed(() => {
    const user = this.authService.currentUser();
    const l = this.listing();
    return l ? this.favouriteService.isFavourite(user?.id, l.id) : false;
  });

  ngOnInit(): void {
    this.fetchListing();
    this.loadComments();
  }

  fetchListing(): void {
    this.isLoading.set(true);
    this.listingService
      .getById(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.listing.set(res);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
  }

  loadComments(): void {
    this.commentService
      .getForListing(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => this.comments.set(Array.isArray(comments) ? comments : [])
      });
  }

  repliesFor(commentId: string): Comment[] {
    return this.comments().filter((comment) => comment.parentId === commentId);
  }

  setReplyTo(comment: Comment | null): void {
    if (!this.authService.currentUser()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.replyTo.set(comment);
  }

  submitComment(): void {
    if (!this.authService.currentUser()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (this.commentControl.invalid) {
      this.commentControl.markAsTouched();
      return;
    }

    this.isPostingComment.set(true);
    this.commentService
      .add(this.id(), this.commentControl.value, this.replyTo()?.id ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comment) => {
          this.comments.update((items) => [...items, comment]);
          this.commentControl.reset();
          this.replyTo.set(null);
          this.isPostingComment.set(false);
          this.toastService.success('Comment posted.');
        },
        error: () => this.isPostingComment.set(false)
      });
  }

  deleteComment(comment: Comment): void {
    if (!window.confirm('Delete this comment?')) {
      return;
    }

    this.commentService
      .delete(comment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.comments.update((items) =>
            items.filter((item) => item.id !== comment.id && item.parentId !== comment.id)
          );
          this.toastService.success('Comment deleted.');
        }
      });
  }

  canDeleteComment(comment: Comment): boolean {
    const user = this.authService.currentUser();
    return Boolean(user && (user.id === comment.authorId || user.id === this.listing()?.ownerId));
  }

  selectPhoto(index: number): void {
    this.activePhotoIndex.set(index);
  }

  openLightbox(): void {
    this.isLightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.isLightboxOpen.set(false);
  }

  nextLightboxPhoto(e: Event): void {
    e.stopPropagation();
    const photos = this.listing()?.photos ?? [];
    if (photos.length === 0) return;
    this.activePhotoIndex.update((curr) => (curr + 1) % photos.length);
  }

  prevLightboxPhoto(e: Event): void {
    e.stopPropagation();
    const photos = this.listing()?.photos ?? [];
    if (photos.length === 0) return;
    this.activePhotoIndex.update((curr) => (curr - 1 + photos.length) % photos.length);
  }

  toggleFavourite(): void {
    const user = this.authService.currentUser();
    if (!user) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const l = this.listing();
    if (!l) return;

    this.favouriteService
      .toggleFavourite(user.id, l.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isFav) => {
        this.toastService.success(
          isFav ? 'Added to favourites!' : 'Removed from favourites.'
        );
      });
  }

  openInquiryDialog(): void {
    const user = this.authService.currentUser();
    if (!user) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }

    const l = this.listing();
    if (!l) return;

    this.dialog.open(InquiryDialogComponent, {
      width: '520px',
      data: { listing: l }
    });
  }

  editListing(): void {
    void this.router.navigate(['/listings', this.id(), 'edit']);
  }

  deleteListing(): void {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this listing? This action cannot be undone.'
    );
    if (!confirmed) {
      return;
    }

    this.listingService
      .delete(this.id())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Listing deleted successfully.');
          void this.router.navigate(['/my-listings']);
        },
        error: () => {
          this.toastService.error('Failed to delete listing.');
        }
      });
  }
}

