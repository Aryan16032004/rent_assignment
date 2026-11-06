import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DashboardData, DashboardService } from '../../../../core/services/dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { passwordStrengthValidator } from '../../../../shared/validators/password-strength.validator';
import { matchFieldsValidator } from '../../../../shared/validators/match-fields.validator';

@Component({
  selector: 'app-profile',
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
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.authService.currentUser;
  readonly dashboard = signal<DashboardData | null>(null);
  readonly isSaving = signal(false);
  readonly isChangingPassword = signal(false);
  readonly roleLabel = computed(() => {
    const role = this.user()?.role ?? 'renter';
    return role === 'both' ? 'Landlord & Renter' : role === 'landlord' ? 'Landlord' : 'Renter';
  });

  readonly profileForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)]
    }),
    phone: new FormControl('', { nonNullable: true })
  });

  readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          passwordStrengthValidator()
        ]
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      })
    },
    {
      validators: [
        matchFieldsValidator('newPassword', 'confirmPassword', 'passwordMismatch'),
        (group: AbstractControl) => {
          const current = group.get('currentPassword')?.value;
          const next = group.get('newPassword')?.value;
          if (current && next && current === next) {
            return { sameAsCurrent: true };
          }
          return null;
        }
      ]
    }
  );

  ngOnInit(): void {
    const user = this.user();
    if (user) {
      this.profileForm.patchValue({ name: user.name, phone: user.phone ?? '' });
    }
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.dashboardService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (data) => this.dashboard.set(data) });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const value = this.profileForm.getRawValue();
    this.authService
      .updateProfile({ name: value.name.trim(), phone: value.phone.trim() || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Profile updated successfully.');
          this.isSaving.set(false);
        },
        error: () => this.isSaving.set(false)
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isChangingPassword.set(true);
    const value = this.passwordForm.getRawValue();
    this.authService
      .changePassword(value.currentPassword, value.newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Password updated successfully.');
          this.passwordForm.reset();
          this.isChangingPassword.set(false);
        },
        error: () => this.isChangingPassword.set(false)
      });
  }
}
