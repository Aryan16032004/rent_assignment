import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  const authServiceMock = {
    register: vi.fn(),
    isEmailTaken: vi.fn()
  };

  const toastServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const routerMock = {
    navigateByUrl: vi.fn().mockResolvedValue(true)
  };

  beforeEach(async () => {
    authServiceMock.register.mockReset();
    authServiceMock.isEmailTaken.mockReset();
    authServiceMock.isEmailTaken.mockReturnValue(of(false));

    toastServiceMock.success.mockReset();
    toastServiceMock.error.mockReset();

    routerMock.navigateByUrl.mockReset();
    routerMock.navigateByUrl.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'returnUrl' ? '/profile' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders registration heading and submit button', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Create your RentHub account');
    expect(compiled.querySelector('button[type="submit"]')?.textContent).toContain('Register');
  });

  it('shows validation messages on invalid submit', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    const errors = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-error')).map((node) =>
      node.textContent?.trim()
    );

    expect(errors).toContain('Name is required.');
    expect(errors).toContain('Email is required.');
    expect(errors).toContain('Password is required.');
    expect(errors).toContain('Confirm your password.');
  });

  it('shows password mismatch error when passwords do not match', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      name: 'Alex User',
      email: 'alex@renthub.com',
      password: 'Strong@123',
      confirmPassword: 'Strong@456'
    });
    fixture.componentInstance.form.controls.confirmPassword.markAsTouched();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.hasError('passwordMismatch')).toBe(true);
  });

  it('validates email uniqueness asynchronously', async () => {
    vi.useFakeTimers();
    authServiceMock.isEmailTaken.mockReturnValue(of(true));

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    const control = fixture.componentInstance.form.controls.email;
    control.setValue('landlord@renthub.com');
    control.markAsTouched();
    control.updateValueAndValidity();

    await vi.advanceTimersByTimeAsync(301);
    fixture.detectChanges();

    expect(control.hasError('emailTaken')).toBe(true);
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('This email is already registered.');
  });

  it('submits a valid form and redirects to returnUrl', async () => {
    authServiceMock.isEmailTaken.mockReturnValue(of(false));
    authServiceMock.register.mockReturnValue(of({
      id: 'u-2',
      name: 'Alex User',
      email: 'alex@renthub.com',
      passwordHash: 'hash',
      role: 'renter',
      createdAt: new Date().toISOString()
    }));

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      name: 'Alex User',
      email: 'alex@renthub.com',
      password: 'Strong@123',
      confirmPassword: 'Strong@123'
    });

    fixture.componentInstance.form.controls.email.clearAsyncValidators();
    fixture.componentInstance.form.controls.email.updateValueAndValidity();
    fixture.detectChanges();

    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(authServiceMock.register).toHaveBeenCalledWith({
      name: 'Alex User',
      email: 'alex@renthub.com',
      password: 'Strong@123',
      role: 'renter'
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Your RentHub account is ready.');
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/profile');
  });

  it('disables submit button while invalid and enables it once all validation passes', async () => {
    authServiceMock.isEmailTaken.mockReturnValue(of(false));

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const submitButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement as HTMLButtonElement;
    expect(component.isSubmitDisabled()).toBe(true);
    expect(submitButton.disabled).toBe(true);

    component.form.setValue({
      name: 'Alex User',
      email: 'alex@renthub.com',
      password: 'Strong@123',
      confirmPassword: 'Strong@123'
    });
    component.form.controls.email.clearAsyncValidators();
    component.form.controls.email.updateValueAndValidity();
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    expect(component.isSubmitDisabled()).toBe(false);
    expect(submitButton.disabled).toBe(false);
  });

  it.each([
    ['weak password', 'weakpassword', 'weakpassword'],
    ['mismatched passwords', 'Strong@123', 'Strong@456']
  ])('keeps submit button disabled for %s', async (_label, password, confirmPassword) => {
    authServiceMock.isEmailTaken.mockReturnValue(of(false));

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      name: 'Alex User',
      email: 'alex@renthub.com',
      password,
      confirmPassword
    });
    fixture.componentInstance.form.controls.email.clearAsyncValidators();
    fixture.componentInstance.form.controls.email.updateValueAndValidity();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.componentInstance.isSubmitDisabled()).toBe(true);
  });

  it('shows backend error message on register failure', async () => {
    authServiceMock.isEmailTaken.mockReturnValue(of(false));
    authServiceMock.register.mockReturnValue(throwError(() => new Error('Email already exists.')));

    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      name: 'Alex User',
      email: 'alex@renthub.com',
      password: 'Strong@123',
      confirmPassword: 'Strong@123'
    });

    fixture.componentInstance.form.controls.email.clearAsyncValidators();
    fixture.componentInstance.form.controls.email.updateValueAndValidity();
    fixture.detectChanges();

    fixture.componentInstance.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorNode = (fixture.nativeElement as HTMLElement).querySelector('.submit-error');
    expect(errorNode?.textContent).toContain('Email already exists.');
  });
});
