import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserRole } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { matchFieldsValidator } from '../../../../shared/validators/match-fields.validator';
import { passwordStrengthValidator } from '../../../../shared/validators/password-strength.validator';
import { uniqueEmailAsyncValidator } from '../../../../shared/validators/unique-email.validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly hidePassword = signal(true);
  readonly hideConfirmPassword = signal(true);
  readonly submitError = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly role = signal<UserRole>('renter');

  readonly form = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)]
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
        asyncValidators: [uniqueEmailAsyncValidator((email) => this.authService.isEmailTaken(email))],
        updateOn: 'blur'
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordStrengthValidator()]
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      })
    },
    {
      validators: [matchFieldsValidator('password', 'confirmPassword', 'passwordMismatch')]
    }
  );

  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status
  });
  readonly isSubmitDisabled = computed(() => this.formStatus() !== 'VALID' || this.isSubmitting());

  submit(): void {
    this.submitError.set(null);

    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

    this.isSubmitting.set(true);

    this.authService
      .register({
        name: this.form.controls.name.value.trim(),
        email: this.form.controls.email.value.trim(),
        password: this.form.controls.password.value,
        role: this.role()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Your RentHub account is ready.');
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: unknown) => {
          this.submitError.set(this.resolveErrorMessage(error));
          this.isSubmitting.set(false);
        },
        complete: () => this.isSubmitting.set(false)
      });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((current) => !current);
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update((current) => !current);
  }

  protected getNameErrorMessage(): string {
    const control = this.form.controls.name;

    if (control.hasError('required')) {
      return 'Name is required.';
    }

    if (control.hasError('minlength')) {
      return 'Name must be at least 2 characters.';
    }

    if (control.hasError('maxlength')) {
      return 'Name must not exceed 60 characters.';
    }

    return '';
  }

  protected getEmailErrorMessage(): string {
    const control = this.form.controls.email;

    if (control.hasError('required')) {
      return 'Email is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    if (control.hasError('emailTaken')) {
      return 'This email is already registered.';
    }

    return '';
  }

  protected getPasswordErrorMessage(): string {
    const control = this.form.controls.password;

    if (control.hasError('required')) {
      return 'Password is required.';
    }

    if (control.hasError('passwordStrength')) {
      return 'Use 8+ chars with uppercase, number, and special character.';
    }

    return '';
  }

  protected getConfirmPasswordErrorMessage(): string {
    const control = this.form.controls.confirmPassword;

    if (control.hasError('required')) {
      return 'Confirm your password.';
    }

    if (this.form.hasError('passwordMismatch') && (control.touched || control.dirty)) {
      return 'Passwords do not match.';
    }

    return '';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Unable to register right now. Please try again.';
  }
}
