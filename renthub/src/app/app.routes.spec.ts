import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { landlordGuard } from './core/guards/landlord.guard';
import { ownerGuard } from './core/guards/owner.guard';
import { listingDraftGuard } from './core/guards/listing-draft.guard';
import { AuthService } from './core/services/auth.service';
import { ListingDraftService } from './core/services/listing-draft.service';
import { ListingService } from './core/services/listing.service';
import { User } from './core/models/user.model';
import { Listing } from './core/models/listing.model';

describe('App Routes and Guards', () => {
  let router: Router;
  let mockAuthService: {
    isLoggedIn: () => boolean;
    currentUser: () => User | null;
  };
  let mockDraftService: {
    hasDraft: () => boolean;
  };
  let mockListingService: {
    getById: (id: string) => Observable<Listing | null>;
  };

  const dummyUser: User = {
    id: 'u-1',
    name: 'Landlord User',
    email: 'landlord@renthub.com',
    role: 'landlord',
    createdAt: new Date().toISOString()
  };

  const dummyRenter: User = {
    id: 'u-2',
    name: 'Renter User',
    email: 'renter@renthub.com',
    role: 'renter',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: () => true,
      currentUser: () => dummyUser
    };
    mockDraftService = {
      hasDraft: () => false
    };
    mockListingService = {
      getById: (_id: string) =>
        of({
          id: 'list-1',
          ownerId: 'u-1',
          title: 'Luxury Villa'
        } as Listing)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ListingDraftService, useValue: mockDraftService },
        { provide: ListingService, useValue: mockListingService }
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

    it('redirects to /login with returnUrl when user is logged out', () => {
      mockAuthService.isLoggedIn = () => false;
      const state = { url: '/favourites' } as RouterStateSnapshot;
      const route = {} as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;
      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Ffavourites');
    });
  });

  describe('guestGuard', () => {
    it('allows access for visitors', () => {
      mockAuthService.isLoggedIn = () => false;
      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/login' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => guestGuard(route, state));
      expect(result).toBe(true);
    });

    it('redirects logged-in users to /', () => {
      mockAuthService.isLoggedIn = () => true;
      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/login' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => guestGuard(route, state)) as UrlTree;
      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result)).toBe('/');
    });
  });

  describe('landlordGuard', () => {
    it('allows access for landlords and both-roles', () => {
      mockAuthService.currentUser = () => dummyUser;
      const route = {} as ActivatedRouteSnapshot;
      const state = {} as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => landlordGuard(route, state));
      expect(result).toBe(true);
    });

    it('redirects renters to dashboard', () => {
      mockAuthService.currentUser = () => dummyRenter;
      const route = {} as ActivatedRouteSnapshot;
      const state = {} as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => landlordGuard(route, state)) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/dashboard');
    });

    it('redirects visitors to login', () => {
      mockAuthService.currentUser = () => null;
      const route = {} as ActivatedRouteSnapshot;
      const state = {} as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => landlordGuard(route, state)) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Flistings%2Fnew');
    });
  });

  describe('ownerGuard', () => {
    it('allows the listing owner to access edit page', async () => {
      mockAuthService.currentUser = () => dummyUser;
      const route = {
        paramMap: {
          get: (param: string) => (param === 'id' ? 'list-1' : null)
        }
      } as unknown as ActivatedRouteSnapshot;

      const result$ = TestBed.runInInjectionContext(() => ownerGuard(route, {} as RouterStateSnapshot));
      const result = await firstValueFrom(result$ as Observable<boolean | UrlTree>);
      expect(result).toBe(true);
    });

    it('denies access if the current user is not the owner', async () => {
      mockAuthService.currentUser = () => dummyRenter;
      const route = {
        paramMap: {
          get: (param: string) => (param === 'id' ? 'list-1' : null)
        }
      } as unknown as ActivatedRouteSnapshot;

      const result$ = TestBed.runInInjectionContext(() => ownerGuard(route, {} as RouterStateSnapshot));
      const result = await firstValueFrom(result$ as Observable<boolean | UrlTree>);
      expect(result instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(result as UrlTree)).toBe('/');
    });
  });

  describe('listingDraftGuard', () => {
    it('allows access when draft is present', () => {
      mockDraftService.hasDraft = () => true;
      const result = TestBed.runInInjectionContext(() =>
        listingDraftGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
      );
      expect(result).toBe(true);
    });

    it('redirects to /listings/new when no draft exists', () => {
      mockDraftService.hasDraft = () => false;
      const result = TestBed.runInInjectionContext(() =>
        listingDraftGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
      ) as UrlTree;
      expect(router.serializeUrl(result)).toBe('/listings/new');
    });
  });
});
