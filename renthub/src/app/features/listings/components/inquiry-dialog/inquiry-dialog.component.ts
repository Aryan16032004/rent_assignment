import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Listing } from '../../../../core/models/listing.model';
import { InquiryService } from '../../../../core/services/inquiry.service';
import { ToastService } from '../../../../core/services/toast.service';

export interface InquiryDialogData {
  listing: Listing;
}

@Component({
  selector: 'app-inquiry-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './inquiry-dialog.component.html',
  styleUrl: './inquiry-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InquiryDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<InquiryDialogComponent>);
  readonly data = inject<InquiryDialogData>(MAT_DIALOG_DATA);
  private readonly inquiryService = inject(InquiryService);
  private readonly toastService = inject(ToastService);

  readonly isSending = signal(false);

  readonly form = new FormGroup({
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)]
    })
  });

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSending.set(true);
    const msg = this.form.controls.message.value;

    this.inquiryService
      .sendInquiry(this.data.listing.id, this.data.listing.ownerId, msg)
      .subscribe({
        next: () => {
          this.toastService.success('Inquiry sent successfully to the owner!');
          this.dialogRef.close(true);
        },
        error: () => {
          this.isSending.set(false);
          this.toastService.error('Failed to send inquiry. Please try again.');
        }
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
