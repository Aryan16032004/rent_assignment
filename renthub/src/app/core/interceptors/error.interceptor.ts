import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      let message = 'Something went wrong. Please try again.';

      if (error instanceof HttpErrorResponse) {
        message = error.error?.message ?? error.message ?? message;

        if (error.status === 401 && authService.isLoggedIn()) {
          authService.logout();
          void router.navigate(['/login'], {
            queryParams: { returnUrl: router.url }
          });
        }
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }

      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        toastService.error(message);
      }

      return throwError(() => error);
    })
  );
};
