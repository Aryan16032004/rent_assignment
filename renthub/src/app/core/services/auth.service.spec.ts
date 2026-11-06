import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, firstValueFrom, of } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { AuthResponse } from '../models/auth.model';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';
import { FavouriteService } from './favourite.service';
import { StorageService } from './storage.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let storage: StorageService;
  let mockFavService: { load: () => Observable<any[]>; clear: () => void };

  const mockUser: User = {
    id: 'user-123',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'renter',
    phone: '+91-9999999999',
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const mockAuthResponse: AuthResponse = {
    token: 'jwt-test-token',
    user: mockUser
  };

  beforeEach(() => {
    mockFavService = {
      load: () => of([]),
      clear: () => {}
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StorageService,
        { provide: FavouriteService, useValue: mockFavService }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(StorageService);

    storage.removeItem(STORAGE_KEYS.authSession);
  });

  afterEach(() => {
    httpMock.verify();
    storage.removeItem(STORAGE_KEYS.authSession);
    TestBed.resetTestingModule();
  });

  it('logs in user, updates signals, and stores session token', async () => {
    const loginPromise = firstValueFrom(service.login('jane@example.com', 'Secret123!'));

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'jane@example.com', password: 'Secret123!' });
    req.flush(mockAuthResponse);

    const user = await loginPromise;
    expect(user).toEqual(mockUser);
    expect(service.isLoggedIn()).toBe(true);
    expect(service.currentUser()).toEqual(mockUser);
    expect(service.getToken()).toBe('jwt-test-token');
  });

  it('logs out and removes stored session', async () => {
    const loginPromise = firstValueFrom(service.login('jane@example.com', 'Secret123!'));
    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    req.flush(mockAuthResponse);
    await loginPromise;

    expect(service.isLoggedIn()).toBe(true);
    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('updates profile and updates currentUser signal', async () => {
    const loginPromise = firstValueFrom(service.login('jane@example.com', 'Secret123!'));
    httpMock.expectOne(`${API_BASE_URL}/auth/login`).flush(mockAuthResponse);
    await loginPromise;

    const updatedUser = { ...mockUser, name: 'Jane Smith' };
    const updatePromise = firstValueFrom(service.updateProfile({ name: 'Jane Smith' }));

    const req = httpMock.expectOne(`${API_BASE_URL}/users/me`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ user: updatedUser });

    const result = await updatePromise;
    expect(result.name).toBe('Jane Smith');
    expect(service.currentUser()?.name).toBe('Jane Smith');
  });

  it('changes password with proper payload', async () => {
    const changePromise = firstValueFrom(service.changePassword('OldPass123!', 'NewPass456!'));

    const req = httpMock.expectOne(`${API_BASE_URL}/users/me/password`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!'
    });
    req.flush({ message: 'Password updated successfully' });

    await changePromise;
  });
});
