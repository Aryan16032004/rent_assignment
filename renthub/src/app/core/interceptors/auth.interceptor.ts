import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP Authentication Interceptor
 * Intercepts all outgoing HTTP requests and automatically injects the Bearer JWT token
 * into the `Authorization` header when a user session is active.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // If no session token exists, proceed with unauthenticated request
  if (!token) {
    return next(request);
  }

  // Clone request to immutably attach Authorization header
  const clonedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(clonedRequest);
};
