import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { AuthResponse, AuthSession } from '../models/auth.model';
import { User, UserRole } from '../models/user.model';
import { FavouriteService } from './favourite.service';
import { StorageService } from './storage.service';

/**
 * Authentication Service
 * Manages user authentication state using Angular Signals, persistent storage,
 * login/registration HTTP workflows, and JWT session restoration.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);
  private readonly favouriteService = inject(FavouriteService);

  // Initial session restored synchronously from storage
  private readonly storedSession = this.storageService.getItem<AuthSession | null>(
    STORAGE_KEYS.authSession,
    null
  );

  // Reactive state signal for the currently logged-in user
  private readonly currentUserSignal = signal<User | null>(this.storedSession?.user ?? null);

  /** Readonly signal exposing the active user */
  readonly currentUser = this.currentUserSignal.asReadonly();

  /** Computed signal indicating whether a user is currently authenticated */
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);

  /**
   * Validates the stored JWT token with the backend on application startup (`/api/auth/me`).
   * Automatically clears invalid or expired sessions.
   */
  restoreSession(): Observable<void> {
    const session = this.storageService.getItem<AuthSession | null>(STORAGE_KEYS.authSession, null);
    if (!session?.token) {
      this.currentUserSignal.set(null);
      return of(void 0);
    }

    return this.http.get<{ user: User }>(`${API_BASE_URL}/auth/me`).pipe(
      tap(({ user }) => {
        this.persistUser(user, session.token);
        this.favouriteService.load().subscribe({ error: () => undefined });
      }),
      map(() => void 0),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.logout();
        }
        return of(void 0);
      })
    );
  }

  /**
   * Authenticates a user with email and password.
   * On success, stores the JWT token and user profile in storage and signals.
   */
  login(email: string, password: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password })
      .pipe(
        tap((response) => this.persistSession(response)),
        map((response) => response.user)
      );
  }

  /**
   * Registers a new user account with role selection ('renter', 'landlord', 'both').
   */
  register(payload: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Observable<User> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/register`, {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        role: payload.role ?? 'renter'
      })
      .pipe(
        tap((response) => this.persistSession(response)),
        map((response) => response.user)
      );
  }

  /**
   * Async validator query checking whether an email address is already registered.
   */
  isEmailTaken(email: string): Observable<boolean> {
    const params = new HttpParams().set('email', email);
    return this.http
      .get<{ taken: boolean }>(`${API_BASE_URL}/users/check-email`, { params })
      .pipe(map((response) => response.taken));
  }

  /**
   * Updates user profile fields (name, phone, avatar).
   */
  updateProfile(payload: {
    name?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  }): Observable<User> {
    return this.http.patch<{ user: User }>(`${API_BASE_URL}/users/me`, payload).pipe(
      tap(({ user }) => {
        const token = this.getToken();
        if (token) {
          this.persistUser(user, token);
        }
      }),
      map(({ user }) => user)
    );
  }

  /**
   * Updates user password after validating current password.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .patch<{ message: string }>(`${API_BASE_URL}/users/me/password`, {
        currentPassword,
        newPassword
      })
      .pipe(map(() => void 0));
  }

  /**
   * Clears the active authentication session, removing stored token and resetting signals.
   */
  logout(): void {
    this.currentUserSignal.set(null);
    this.storageService.removeItem(STORAGE_KEYS.authSession);
    this.favouriteService.clear();
  }

  /**
   * Returns the current raw JWT token string, or null if unauthenticated.
   */
  getToken(): string | null {
    const session = this.storageService.getItem<AuthSession | null>(STORAGE_KEYS.authSession, null);
    return session?.token ?? null;
  }

  private persistSession(response: AuthResponse): void {
    this.persistUser(response.user, response.token);
    this.favouriteService.load().subscribe({ error: () => undefined });
  }

  private persistUser(user: User, token: string): void {
    const session: AuthSession = {
      userId: user.id,
      token,
      user
    };
    this.storageService.setItem(STORAGE_KEYS.authSession, session);
    this.currentUserSignal.set(user);
  }
}
