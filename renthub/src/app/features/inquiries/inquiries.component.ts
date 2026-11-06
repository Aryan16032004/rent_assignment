import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Inquiry, InquiryStatus } from '../../core/models/inquiry.model';
import { AuthService } from '../../core/services/auth.service';
import { InquiryService } from '../../core/services/inquiry.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-inquiries',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './inquiries.component.html',
  styleUrl: './inquiries.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InquiriesComponent {
  private readonly inquiryService = inject(InquiryService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.authService.currentUser;
  readonly activeTab = signal<'received' | 'sent'>('received');
  readonly received = signal<Inquiry[]>([]);
  readonly sent = signal<Inquiry[]>([]);
  readonly selected = signal<Inquiry | null>(null);
  readonly isLoading = signal(true);
  readonly isSending = signal(false);

  readonly replyControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.inquiryService
      .getReceived()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (items) => this.received.set(items) });

    this.inquiryService
      .getSent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.sent.set(items);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
  }

  currentList(): Inquiry[] {
    return this.activeTab() === 'received' ? this.received() : this.sent();
  }

  selectInquiry(inquiry: Inquiry): void {
    this.inquiryService
      .getById(inquiry.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (full) => this.selected.set(full) });
  }

  isReceiver(inquiry: Inquiry): boolean {
    return inquiry.toUserId === this.user()?.id;
  }

  updateStatus(inquiry: Inquiry, status: InquiryStatus): void {
    this.inquiryService
      .updateStatus(inquiry.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.received.update((items) =>
            items.map((item) => (item.id === updated.id ? { ...item, status } : item))
          );
          const current = this.selected();
          if (current?.id === updated.id) {
            this.selected.set({ ...current, status });
          }
          this.toastService.success(`Inquiry marked as ${status}.`);
        }
      });
  }

  sendReply(): void {
    const inquiry = this.selected();
    if (!inquiry || this.replyControl.invalid) {
      this.replyControl.markAsTouched();
      return;
    }

    this.isSending.set(true);
    this.inquiryService
      .reply(inquiry.id, this.replyControl.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.replyControl.reset();
          this.isSending.set(false);
          this.selectInquiry(inquiry);
        },
        error: () => this.isSending.set(false)
      });
  }
}
