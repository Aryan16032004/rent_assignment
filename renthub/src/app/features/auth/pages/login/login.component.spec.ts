import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const authServiceMock = {
    login: vi.fn()
  };

  const toastServiceMock = {
    success: vi.fn(),
    error: vi.fn()
  };

  const routerMock = {
    navigateByUrl: vi.fn().mockResolvedValue(true)
  };

  beforeEach(async () => {
    authServiceMock.login.mockReset();
    toastServiceMock.success.mockReset();
    toastServiceMock.error.mockReset();
    routerMock.navigateByUrl.mockReset();
    routerMock.navigateByUrl.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
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
                get: (key: string) => (key === 'returnUrl' ? '/favourites' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();
  });

  it('renders login heading and submit button', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Login to RentHub');
    expect(compiled.querySelector('button[type="submit"]')?.textContent).toContain('Login');
  });

  it('shows validation messages on invalid submit', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.submit();
    fixture.detectChanges();

    const errors = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mat-error')).map((node) =>
      node.textContent?.trim()
    );

    expect(errors).toContain('Email is required.');
    expect(errors).toContain('Password is required.');
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('disables submit button while form is invalid and enables it once valid', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const submitButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement as HTMLButtonElement;
    expect(component.isSubmitDisabled()).toBe(true);
    expect(submitButton.disabled).toBe(true);

    component.form.setValue({
      email: 'renter@renthub.com',
      password: 'Renter@123'
    });
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    expect(component.isSubmitDisabled()).toBe(false);
    expect(submitButton.disabled).toBe(false);
  });

  it('submits credentials and redirects to returnUrl', () => {
    authServiceMock.login.mockReturnValue(of({
      id: 'u-1',
      name: 'Demo User',
      email: 'renter@renthub.com',
      passwordHash: 'hash',
      role: 'renter',
      createdAt: new Date().toISOString()
    }));

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      email: 'renter@renthub.com',
      password: 'Renter@123'
    });
    fixture.componentInstance.submit();

    expect(authServiceMock.login).toHaveBeenCalledWith('renter@renthub.com', 'Renter@123');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Welcome back to RentHub.');
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/favourites');
  });

  it('shows friendly error for invalid credentials', () => {
    authServiceMock.login.mockReturnValue(throwError(() => new Error('Invalid email or password.')));

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      email: 'wrong@renthub.com',
      password: 'Wrong@123'
    });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    const errorNode = (fixture.nativeElement as HTMLElement).querySelector('.submit-error');
    expect(errorNode?.textContent).toContain('Invalid email or password.');
  });
});
