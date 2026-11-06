import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly hidePassword = signal(true);
  readonly submitError = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status
  });
  readonly isSubmitDisabled = computed(() => this.formStatus() !== 'VALID' || this.isSubmitting());

  submit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.controls.email.value.trim();
    const password = this.form.controls.password.value;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

    this.isSubmitting.set(true);

    this.authService
      .login(email, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Welcome back to RentHub.');
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

  fillDemo(email: string, pass: string): void {
    this.form.patchValue({ email, password: pass });
    this.submitError.set(null);
  }

  protected getEmailErrorMessage(): string {
    const control = this.form.controls.email;

    if (control.hasError('required')) {
      return 'Email is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    return '';
  }

  protected getPasswordErrorMessage(): string {
    return this.form.controls.password.hasError('required') ? 'Password is required.' : '';
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.message === 'string' && error.error.message.trim().length > 0) {
        return error.error.message;
      }
      if (error.status === 401) {
        return 'Invalid email or password.';
      }
    }
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Unable to sign in. Please try again.';
  }
}
