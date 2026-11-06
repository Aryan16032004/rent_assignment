import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { AuthResponse, AuthSession } from '../models/auth.model';
import { User, UserRole } from '../models/user.model';
import { FavouriteService } from './favourite.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);
  private readonly favouriteService = inject(FavouriteService);
  private readonly storedSession = this.storageService.getItem<AuthSession | null>(
    STORAGE_KEYS.authSession,
    null
  );
  private readonly currentUserSignal = signal<User | null>(this.storedSession?.user ?? null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);

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

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password })
      .pipe(
        tap((response) => this.persistSession(response)),
        map((response) => response.user)
      );
  }

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

  isEmailTaken(email: string): Observable<boolean> {
    const params = new HttpParams().set('email', email);
    return this.http
      .get<{ taken: boolean }>(`${API_BASE_URL}/users/check-email`, { params })
      .pipe(map((response) => response.taken));
  }

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

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .patch<{ message: string }>(`${API_BASE_URL}/users/me/password`, {
        currentPassword,
        newPassword
      })
      .pipe(map(() => void 0));
  }

  logout(): void {
    this.currentUserSignal.set(null);
    this.storageService.removeItem(STORAGE_KEYS.authSession);
    this.favouriteService.clear();
  }

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
