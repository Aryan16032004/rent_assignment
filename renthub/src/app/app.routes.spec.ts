import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';
import { User } from './core/models/user.model';

describe('App Routes and Auth Guard', () => {
  let router: Router;
  let mockAuthService: {
    isLoggedIn: () => boolean;
    currentUser: () => User | null;
  };

  const dummyUser: User = {
    id: 'u-1',
    name: 'Test User',
    email: 'test@renthub.com',
    role: 'renter',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: () => true,
      currentUser: () => dummyUser
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    router = TestBed.inject(Router);
  });

  describe('Route Table Configuration', () => {
    it('defines root shell route with expected children', () => {
      expect(routes.length).toBeGreaterThan(0);
      const root = routes[0];
      expect(root.path).toBe('');
      expect(root.children).toBeDefined();

      const paths = root.children!.map((c) => c.path);
      expect(paths).toContain('');
      expect(paths).toContain('listings/new');
      expect(paths).toContain('listings/preview');
      expect(paths).toContain('listings/:id/edit');
      expect(paths).toContain('listings/:id');
      expect(paths).toContain('my-listings');
      expect(paths).toContain('favourites');
      expect(paths).toContain('profile');
      expect(paths).toContain('login');
      expect(paths).toContain('register');
      expect(paths).toContain('**');
    });
  });

  describe('authGuard', () => {
    it('allows navigation when user is logged in', () => {
      mockAuthService.isLoggedIn = () => true;
      const state = { url: '/profile' } as RouterStateSnapshot;
      const route = {} as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(route, state));
      expect(result).toBe(true);
    });

    it('redirects to /login when user is not logged in', () => {
      mockAuthService.isLoggedIn = () => false;
      const state = { url: '/profile' } as RouterStateSnapshot;
      const route = {} as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(route, state));
      expect(result instanceof UrlTree).toBe(true);
      const urlTree = result as UrlTree;
      expect(urlTree.toString()).toContain('/login');
    });
  });
});
