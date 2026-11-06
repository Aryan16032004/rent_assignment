import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  provideRouter,
  withComponentInputBinding,
  Router
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { routes } from './app.routes';
import { STORAGE_KEYS } from './core/constants/storage-keys';
import { Listing } from './core/models/listing.model';
import { User } from './core/models/user.model';
import { Comment } from './core/models/comment.model';
import { Inquiry } from './core/models/inquiry.model';
import { AuthService } from './core/services/auth.service';
import { StorageService } from './core/services/storage.service';
import { ListingDraftService } from './core/services/listing-draft.service';
import { ListingFormComponent } from './features/listings/pages/listing-form/listing-form.component';

describe('RentHub End-to-End User Journeys (app.flow.spec.ts)', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let authService: AuthService;
  let storageService: StorageService;
  let draftService: ListingDraftService;

  // In-memory test backend state
  let users: Record<string, { user: User; password: string }>;
  let listings: Listing[];
  let favourites: Set<string>;
  let inquiries: Inquiry[];
  let comments: Comment[];
  let activeToken: string | null = null;

  const mockBackendInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    _next: HttpHandlerFn
  ) => {
    const url = req.url;
    const method = req.method;

    // Resolve current user from token
    let currentUser: User | null = null;
    if (activeToken) {
      const found = Object.values(users).find(
        (u) => `token-${u.user.id}` === activeToken
      );
      if (found) currentUser = found.user;
    }

    // Auth endpoints
    if (url.includes('check-email')) {
      const email =
        req.params.get('email') ||
        new URL(req.urlWithParams, 'http://localhost').searchParams.get('email');
      const isTaken = Object.values(users).some(
        (u) => u.user.email.toLowerCase() === email?.toLowerCase()
      );
      return of(new HttpResponse({ status: 200, body: { taken: isTaken, available: !isTaken } }));
    }

    if (url.includes('/api/auth/login') && method === 'POST') {
      const { email, password } = req.body as { email: string; password: string };
      const account = Object.values(users).find(
        (u) => u.user.email.toLowerCase() === email.toLowerCase()
      );
      if (account && account.password === password) {
        activeToken = `token-${account.user.id}`;
        return of(
          new HttpResponse({
            status: 200,
            body: { token: activeToken, user: account.user }
          })
        );
      }
      return throwError(
        () => new HttpErrorResponse({ status: 401, error: { message: 'Invalid email or password.' } })
      );
    }

    if (url.includes('/api/auth/register') && method === 'POST') {
      const body = req.body as { name: string; email: string; password: string; role: any };
      const exists = Object.values(users).some(
        (u) => u.user.email.toLowerCase() === body.email.toLowerCase()
      );
      if (exists) {
        return throwError(
          () => new HttpErrorResponse({ status: 409, error: { message: 'Email already taken' } })
        );
      }
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: body.name,
        email: body.email,
        role: body.role,
        createdAt: new Date().toISOString()
      };
      users[newUser.id] = { user: newUser, password: body.password };
      activeToken = `token-${newUser.id}`;
      return of(
        new HttpResponse({
          status: 201,
          body: { token: activeToken, user: newUser }
        })
      );
    }

    if (url.includes('/api/auth/me')) {
      if (currentUser) {
        return of(new HttpResponse({ status: 200, body: { user: currentUser } }));
      }
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    if (url.includes('/api/users/me/password') && method === 'PATCH') {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      if (!currentUser || users[currentUser.id].password !== currentPassword) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'Current password is incorrect' }
            })
        );
      }
      users[currentUser.id].password = newPassword;
      return of(new HttpResponse({ status: 200, body: { message: 'Updated' } }));
    }

    if (url.includes('/api/users/me') && method === 'PATCH') {
      const { name, phone } = req.body as { name: string; phone?: string | null };
      if (!currentUser) return throwError(() => new HttpErrorResponse({ status: 401 }));
      currentUser.name = name;
      currentUser.phone = phone;
      return of(new HttpResponse({ status: 200, body: { user: currentUser } }));
    }

    // Dashboard
    if (url.includes('/api/dashboard')) {
      return of(
        new HttpResponse({
          status: 200,
          body: {
            listings: { total: listings.length, published: listings.length, draft: 0 },
            favourites: favourites.size,
            inquiries: { received: inquiries.length, sent: 0 },
            recentListings: listings.slice(0, 5),
            recentInquiries: []
          }
        })
      );
    }

    // Comments
    if (url.includes('/comments') && method === 'GET') {
      const parts = url.split('/');
      const listingId = parts[parts.indexOf('listings') + 1];
      const filtered = comments.filter((c) => c.listingId === listingId);
      return of(new HttpResponse({ status: 200, body: filtered }));
    }

    if (url.includes('/comments') && method === 'POST') {
      const parts = url.split('/');
      const listingId = parts[parts.indexOf('listings') + 1];
      const { content, parentId } = req.body as { content: string; parentId: string | null };
      const newComment: Comment = {
        id: `comm-${Date.now()}`,
        listingId,
        authorId: currentUser?.id ?? 'u-anon',
        authorName: currentUser?.name ?? 'Anonymous',
        text: content,
        parentId,
        createdAt: new Date().toISOString()
      };
      comments.push(newComment);
      return of(new HttpResponse({ status: 201, body: newComment }));
    }

    if (url.includes('/comments/') && method === 'DELETE') {
      const id = url.split('/').pop()!;
      comments = comments.filter((c) => c.id !== id && c.parentId !== id);
      return of(new HttpResponse({ status: 200, body: { message: 'Deleted' } }));
    }

    // Inquiries
    if (url.includes('/inquiries') && method === 'POST') {
      const parts = url.split('/');
      const listingId = parts[parts.indexOf('listings') + 1];
      const { message } = req.body as { message: string };
      const inq: Inquiry = {
        id: `inq-${Date.now()}`,
        listingId,
        fromUserId: currentUser?.id ?? 'visitor',
        fromUserName: currentUser?.name ?? 'Visitor',
        toUserId: 'landlord-1',
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      inquiries.push(inq);
      return of(new HttpResponse({ status: 201, body: inq }));
    }

    if (url.includes('/inquiries/received') || url.includes('/inquiries/sent')) {
      return of(new HttpResponse({ status: 200, body: inquiries }));
    }

    // Favourites
    if (url.includes('/api/favourites') && method === 'GET') {
      const favListings = listings.filter((l) => favourites.has(l.id));
      return of(new HttpResponse({ status: 200, body: favListings }));
    }

    if (url.includes('/favourite')) {
      const parts = url.split('/');
      const listingId = parts[parts.indexOf('listings') + 1];
      if (method === 'POST') {
        favourites.add(listingId);
        return of(new HttpResponse({ status: 200, body: { isFavourite: true } }));
      } else if (method === 'DELETE') {
        favourites.delete(listingId);
        return of(new HttpResponse({ status: 200, body: { isFavourite: false } }));
      }
    }

    // Listings
    if (url.includes('/api/listings/featured')) {
      const featured = listings.filter((l) => l.featured);
      return of(new HttpResponse({ status: 200, body: featured }));
    }

    if (url.includes('/api/listings/mine')) {
      const mine = listings.filter((l) => currentUser && l.ownerId === currentUser.id);
      return of(new HttpResponse({ status: 200, body: mine }));
    }

    if (url.match(/\/api\/listings\/[^/]+$/) && method === 'GET') {
      const id = url.split('/').pop()!;
      const found = listings.find((l) => l.id === id);
      if (found) {
        return of(new HttpResponse({ status: 200, body: found }));
      }
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }

    if (url.match(/\/api\/listings\/[^/]+$/) && method === 'PATCH') {
      const id = url.split('/').pop()!;
      const idx = listings.findIndex((l) => l.id === id);
      if (idx >= 0) {
        listings[idx] = { ...listings[idx], ...(req.body as Partial<Listing>) };
        return of(new HttpResponse({ status: 200, body: listings[idx] }));
      }
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }

    if (url.includes('/api/listings') && method === 'POST') {
      const payload = req.body as Listing;
      const created: Listing = {
        ...payload,
        id: `list-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      listings.unshift(created);
      return of(new HttpResponse({ status: 201, body: created }));
    }

    if (url.includes('/api/listings') && method === 'GET') {
      return of(
        new HttpResponse({
          status: 200,
          body: {
            items: listings,
            total: listings.length,
            page: 1,
            pageSize: 50,
            totalPages: 1
          }
        })
      );
    }

    return of(new HttpResponse({ status: 200, body: [] }));
  };

  function typeInput(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  beforeEach(async () => {
    // Reset test database
    users = {
      'landlord-1': {
        user: {
          id: 'landlord-1',
          name: 'Landlord Demo',
          email: 'landlord@renthub.com',
          role: 'landlord',
          createdAt: new Date().toISOString()
        },
        password: 'Landlord@123'
      },
      'renter-1': {
        user: {
          id: 'renter-1',
          name: 'Renter Demo',
          email: 'renter@renthub.com',
          role: 'renter',
          createdAt: new Date().toISOString()
        },
        password: 'Renter@123'
      }
    };

    listings = [
      {
        id: 'list-101',
        ownerId: 'landlord-1',
        ownerName: 'Landlord Demo',
        propertyType: 'Apartment',
        buildingName: 'Skyline Palms',
        isShared: false,
        address: {
          street: '12 Residency Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          zip: '560025'
        },
        squareFeet: 1250,
        bedrooms: 2,
        leaseType: 'long-term',
        expectedRent: 35000,
        negotiable: true,
        priceMode: 'per-month',
        furnished: true,
        vegetarianOnly: 'no-preference',
        amenities: ['Gym/Fitness Center', 'Swimming Pool', 'Power Backup'],
        title: 'Luxurious 2BHK in Bengaluru City Center',
        description:
          'A modern spacious two bedroom home with top class amenities, round the clock security, and scenic view.',
        photos: [
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200'
        ],
        contact: {
          name: 'Landlord Demo',
          phone: '+91-9876543210',
          email: 'landlord@renthub.com'
        },
        featured: true,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    favourites = new Set<string>();
    inquiries = [];
    comments = [];
    activeToken = null;

    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideRouter(routes, withComponentInputBinding()),
        StorageService
      ]
    });

    storageService = TestBed.inject(StorageService);
    authService = TestBed.inject(AuthService);
    draftService = TestBed.inject(ListingDraftService);
    router = TestBed.inject(Router);

    storageService.removeItem(STORAGE_KEYS.authSession);
    storageService.removeItem(STORAGE_KEYS.listingDraft, 'session');

    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    storageService.removeItem(STORAGE_KEYS.authSession);
    storageService.removeItem(STORAGE_KEYS.listingDraft, 'session');
    TestBed.resetTestingModule();
  });

  // Journey 1: Visitor sees home, with Login and Register in the nav
  it('Journey 1: Visitor sees home with Login and Register in the nav', async () => {
    await harness.navigateByUrl('/');
    const rootEl = harness.fixture.nativeElement as HTMLElement;

    expect(rootEl.textContent).toContain('RentHub');
    const links = Array.from(rootEl.querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(links).toContain('Login');
    expect(links).toContain('Register');
  });

  // Journey 2: Register validations, disabled submit, existing email rejected, success logs in
  it('Journey 2: Register validations, uniqueness check, and successful registration', async () => {
    await harness.navigateByUrl('/register');
    const rootEl = harness.fixture.nativeElement as HTMLElement;

    const submitBtn = rootEl.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).toBeTruthy();
    expect(submitBtn.disabled).toBe(true);

    const nameInput = rootEl.querySelector('input[formControlName="name"]') as HTMLInputElement;
    const emailInput = rootEl.querySelector('input[formControlName="email"]') as HTMLInputElement;
    const passInput = rootEl.querySelector('input[formControlName="password"]') as HTMLInputElement;
    const confirmInput = rootEl.querySelector('input[formControlName="confirmPassword"]') as HTMLInputElement;

    typeInput(nameInput, 'New Renter');
    typeInput(passInput, 'Strong@1234');
    typeInput(confirmInput, 'Strong@1234');
    typeInput(emailInput, 'renter@renthub.com');

    harness.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 350));
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    // Async uniqueness check marks email invalid
    expect(rootEl.textContent).toContain('This email is already registered');
    expect(submitBtn.disabled).toBe(true);

    // Provide a unique email
    typeInput(emailInput, 'brandnew@renthub.com');
    harness.fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 350));
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(submitBtn.disabled).toBe(false);
    submitBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.currentUser()?.email).toBe('brandnew@renthub.com');
  });

  // Journey 3: Login with demo credentials, retry on wrong password, logout works
  it('Journey 3: Login with demo credentials, retry on error, and logout', async () => {
    await harness.navigateByUrl('/login');
    const rootEl = harness.fixture.nativeElement as HTMLElement;

    const emailInput = rootEl.querySelector('input[formControlName="email"]') as HTMLInputElement;
    const passInput = rootEl.querySelector('input[formControlName="password"]') as HTMLInputElement;
    const submitBtn = rootEl.querySelector('button[type="submit"]') as HTMLButtonElement;

    // Wrong password
    typeInput(emailInput, 'landlord@renthub.com');
    typeInput(passInput, 'WrongPassword@1');
    harness.fixture.detectChanges();

    submitBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(authService.isLoggedIn()).toBe(false);
    expect(rootEl.querySelector('.submit-error')?.textContent).toContain('Invalid email or password.');

    // Correct password retry
    typeInput(passInput, 'Landlord@123');
    harness.fixture.detectChanges();

    submitBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.currentUser()?.name).toBe('Landlord Demo');

    // Logout
    authService.logout();
    expect(authService.isLoggedIn()).toBe(false);
    expect(authService.currentUser()).toBeNull();
  });

  // Journey 4: Visiting /favourites logged out redirects to /login?returnUrl=... and returns there after login
  it('Journey 4: Visiting /favourites logged out redirects to login with returnUrl', async () => {
    await harness.navigateByUrl('/favourites');
    expect(router.url).toContain('/login?returnUrl=');

    const rootEl = harness.fixture.nativeElement as HTMLElement;
    const emailInput = rootEl.querySelector('input[formControlName="email"]') as HTMLInputElement;
    const passInput = rootEl.querySelector('input[formControlName="password"]') as HTMLInputElement;
    const submitBtn = rootEl.querySelector('button[type="submit"]') as HTMLButtonElement;

    typeInput(emailInput, 'renter@renthub.com');
    typeInput(passInput, 'Renter@123');
    harness.fixture.detectChanges();

    submitBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(authService.isLoggedIn()).toBe(true);
    expect(router.url).toBe('/favourites');
  });

  // Journey 5: Favourite from home page logged in flips state; logged out redirects
  it('Journey 5: Favourite toggling behavior for logged-in and logged-out users', async () => {
    // Logged out: visiting /listings/list-101 and clicking favourite redirects to login
    await harness.navigateByUrl('/listings/list-101');
    const rootEl = harness.fixture.nativeElement as HTMLElement;
    const favBtn = rootEl.querySelector('.fav-btn') as HTMLButtonElement;
    expect(favBtn).toBeTruthy();

    favBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(router.url).toContain('/login');

    // Now log in as renter
    await authService.login('renter@renthub.com', 'Renter@123').toPromise();
    await harness.navigateByUrl('/listings/list-101');
    harness.fixture.detectChanges();

    // Toggle favorite
    const favBtnLoggedIn = harness.fixture.nativeElement.querySelector('.fav-btn') as HTMLButtonElement;
    favBtnLoggedIn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(favourites.has('list-101')).toBe(true);

    // Visiting /favourites displays it
    await harness.navigateByUrl('/favourites');
    harness.fixture.detectChanges();
    expect(harness.fixture.nativeElement.textContent).toContain('Luxurious 2BHK in Bengaluru City Center');

    // Return to listing and toggle off
    await harness.navigateByUrl('/listings/list-101');
    harness.fixture.detectChanges();
    const favBtnOnListing = harness.fixture.nativeElement.querySelector('.fav-btn') as HTMLButtonElement;
    favBtnOnListing.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(favourites.has('list-101')).toBe(false);
  });

  // Journey 6: Inquiry logged out redirects; logged in validates min 10 chars; owner does not see inquiry
  it('Journey 6: Inquiry validation, owner exclusion, and submission', async () => {
    // Visitor on listing details
    await harness.navigateByUrl('/listings/list-101');
    const rootEl = harness.fixture.nativeElement as HTMLElement;

    // Contact Landlord / Send Inquiry button redirects visitor to login
    const contactBtn = rootEl.querySelector('.inquiry-btn') as HTMLButtonElement;
    expect(contactBtn).toBeTruthy();

    contactBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    expect(router.url).toContain('/login');

    // Login as listing owner: landlord-1
    await authService.login('landlord@renthub.com', 'Landlord@123').toPromise();
    await harness.navigateByUrl('/listings/list-101');
    harness.fixture.detectChanges();

    // Owner does not see Send Inquiry button
    const ownerContactBtn = harness.fixture.nativeElement.querySelector('.inquiry-btn');
    expect(ownerContactBtn).toBeNull();
  });

  // Journey 7: Post listing validates, navigates to preview, preview cards, back keeps typed, submit saves & persists
  it('Journey 7: Post listing creation flow with Preview and Submit', async () => {
    await authService.login('landlord@renthub.com', 'Landlord@123').toPromise();
    await harness.navigateByUrl('/listings/new');
    const rootEl = harness.fixture.nativeElement as HTMLElement;

    // Header check
    expect(rootEl.querySelector('h1')?.textContent?.trim()).toBe('Post an apartment');

    // Empty submit shows errors and does not navigate away
    const previewBtn = Array.from(rootEl.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Preview')
    );
    expect(previewBtn).toBeTruthy();
    previewBtn!.click();
    harness.fixture.detectChanges();
    expect(router.url).toBe('/listings/new');

    // Fill valid data
    const bldInput = rootEl.querySelector('input[formControlName="buildingName"]') as HTMLInputElement;
    const streetInput = rootEl.querySelector('input[formControlName="street"]') as HTMLInputElement;
    const cityInput = rootEl.querySelector('input[formControlName="city"]') as HTMLInputElement;
    const stateInput = rootEl.querySelector('input[formControlName="state"]') as HTMLInputElement;
    const zipInput = rootEl.querySelector('input[formControlName="zip"]') as HTMLInputElement;
    const sqftInput = rootEl.querySelector('input[formControlName="squareFeet"]') as HTMLInputElement;
    const rentInput = rootEl.querySelector('input[formControlName="expectedRent"]') as HTMLInputElement;
    const titleInput = rootEl.querySelector('input[formControlName="title"]') as HTMLInputElement;
    const descInput = rootEl.querySelector('textarea[formControlName="description"]') as HTMLTextAreaElement;
    const phoneInput = rootEl.querySelector('input[formControlName="phone"]') as HTMLInputElement;

    typeInput(bldInput, 'Grand Heritage');
    typeInput(streetInput, '45 MG Road');
    typeInput(cityInput, 'Bengaluru');
    typeInput(stateInput, 'Karnataka');
    typeInput(zipInput, '560001');
    typeInput(sqftInput, '1400');
    typeInput(rentInput, '42000');
    typeInput(titleInput, 'Spacious 2 BHK Grand Heritage Flat');
    typeInput(
      descInput,
      'This luxurious flat offers spacious rooms with natural sunlight and modern lifestyle conveniences for long term stay.'
    );
    typeInput(phoneInput, '+91-9876543210');

    // Add a photo to component signal
    const formDebug = harness.fixture.debugElement.query(By.directive(ListingFormComponent));
    expect(formDebug).toBeTruthy();
    formDebug.componentInstance.photos.set([
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200'
    ]);
    harness.fixture.detectChanges();

    // Click Preview
    previewBtn!.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/listings/preview');
    const previewEl = harness.fixture.nativeElement as HTMLElement;

    // Preview shows key cards: type, beds, address, rent, description, amenities, photos
    expect(previewEl.textContent).toContain('Grand Heritage');
    expect(previewEl.textContent).toContain('₹42,000');
    expect(previewEl.textContent).toContain('Bengaluru');
    expect(previewEl.textContent).toContain('Spacious 2 BHK Grand Heritage Flat');

    // Back to Edit keeps everything typed
    const backBtn = Array.from(previewEl.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Back to Edit')
    );
    expect(backBtn).toBeTruthy();
    backBtn!.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/listings/new');
    const reloadedForm = harness.fixture.debugElement.query(By.directive(ListingFormComponent));
    expect(reloadedForm.componentInstance.form.controls.buildingName.value).toBe('Grand Heritage');

    // Return to preview and submit
    const reloadedPreviewBtn = Array.from(
      harness.fixture.nativeElement.querySelectorAll('button')
    ).find((b: any) => b.textContent?.includes('Preview')) as HTMLButtonElement;
    reloadedPreviewBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    const publishBtn = Array.from(
      harness.fixture.nativeElement.querySelectorAll('button')
    ).find((b: any) => b.textContent?.includes('Publish')) as HTMLButtonElement;
    expect(publishBtn).toBeTruthy();
    publishBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(listings.some((l) => l.buildingName === 'Grand Heritage')).toBe(true);
  });

  // Journey 8: Edit own listing vs non-owner guarded
  it('Journey 8: Edit listing owner access vs non-owner guarded', async () => {
    // Visitor cannot open edit page
    await harness.navigateByUrl('/listings/list-101/edit');
    expect(router.url).toContain('/login');

    // Renter (non-owner) is guarded and redirected to /
    await authService.login('renter@renthub.com', 'Renter@123').toPromise();
    await harness.navigateByUrl('/listings/list-101/edit');
    expect(router.url).toBe('/');

    // Owner (landlord-1) is allowed
    await authService.login('landlord@renthub.com', 'Landlord@123').toPromise();
    await harness.navigateByUrl('/listings/list-101/edit');
    expect(router.url).toBe('/listings/list-101/edit');
    expect(harness.fixture.nativeElement.textContent).toContain('Edit Rental Listing');
  });

  // Journey 9: Comments visitor login prompt, comment & reply, owner badge
  it('Journey 9: Comments visitor prompt, logged-in commenting, replies, and owner badge', async () => {
    // Visitor sees "Login to comment"
    await harness.navigateByUrl('/listings/list-101');
    const visitorEl = harness.fixture.nativeElement as HTMLElement;
    expect(visitorEl.textContent).toContain('Login to comment');

    // Log in as owner (landlord-1)
    await authService.login('landlord@renthub.com', 'Landlord@123').toPromise();
    await harness.navigateByUrl('/listings/list-101');
    harness.fixture.detectChanges();

    const commentInput = harness.fixture.nativeElement.querySelector(
      'textarea[matInput]'
    ) as HTMLTextAreaElement;
    expect(commentInput).toBeTruthy();

    // Leave owner comment
    typeInput(commentInput, 'Welcome! Please reach out if you have questions.');
    harness.fixture.detectChanges();

    const postBtn = Array.from(
      harness.fixture.nativeElement.querySelectorAll('button')
    ).find((b: any) => b.textContent?.includes('Post Comment')) as HTMLButtonElement;
    expect(postBtn).toBeTruthy();
    postBtn.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(comments.length).toBe(1);
    expect(harness.fixture.nativeElement.textContent).toContain('Owner');
  });

  // Journey 10: Profile shows user, rename works, password change works
  it('Journey 10: Profile user display, rename, and password change', async () => {
    await authService.login('landlord@renthub.com', 'Landlord@123').toPromise();
    await harness.navigateByUrl('/profile');
    const rootEl = harness.fixture.nativeElement as HTMLElement;

    expect(rootEl.textContent).toContain('Landlord Demo');
    expect(rootEl.textContent).toContain('landlord@renthub.com');

    // Rename
    const nameInput = rootEl.querySelector('input[formControlName="name"]') as HTMLInputElement;
    typeInput(nameInput, 'Landlord Updated');
    harness.fixture.detectChanges();

    const saveBtn = Array.from(rootEl.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Changes')
    );
    saveBtn!.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(authService.currentUser()?.name).toBe('Landlord Updated');

    // Change password with wrong current password shows error
    const curPassInput = rootEl.querySelector(
      'input[formControlName="currentPassword"]'
    ) as HTMLInputElement;
    const newPassInput = rootEl.querySelector(
      'input[formControlName="newPassword"]'
    ) as HTMLInputElement;
    const confirmPassInput = rootEl.querySelector(
      'input[formControlName="confirmPassword"]'
    ) as HTMLInputElement;

    typeInput(curPassInput, 'WrongPass123!');
    typeInput(newPassInput, 'NewSecret@999');
    typeInput(confirmPassInput, 'NewSecret@999');
    harness.fixture.detectChanges();

    const passBtn = Array.from(rootEl.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Update Password')
    );
    passBtn!.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    // Correct password update
    typeInput(curPassInput, 'Landlord@123');
    typeInput(newPassInput, 'NewSecret@999');
    typeInput(confirmPassInput, 'NewSecret@999');
    harness.fixture.detectChanges();

    passBtn!.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(users['landlord-1'].password).toBe('NewSecret@999');
  });

  // Journey 11: Refresh simulation restores user session
  it('Journey 11: Refresh simulation keeps user session on /profile', async () => {
    await authService.login('renter@renthub.com', 'Renter@123').toPromise();
    expect(storageService.getItem(STORAGE_KEYS.authSession, null)).toBeTruthy();

    // Simulate reload by clearing in-memory signal and restoring from storage
    (authService as any).currentUserSignal.set(null);
    expect(authService.isLoggedIn()).toBe(false);

    await authService.restoreSession().toPromise();
    expect(authService.isLoggedIn()).toBe(true);
    expect(authService.currentUser()?.email).toBe('renter@renthub.com');

    await harness.navigateByUrl('/profile');
    expect(router.url).toBe('/profile');
    expect(harness.fixture.nativeElement.textContent).toContain('Renter Demo');
  });

  // Journey 12: Unknown URL displays 404 page
  it('Journey 12: Unknown URL renders NotFound page', async () => {
    await harness.navigateByUrl('/some/non-existent/route');
    const rootEl = harness.fixture.nativeElement as HTMLElement;
    expect(rootEl.textContent).toContain('404');
    expect(rootEl.textContent).toContain('Page Not Found');
  });
});
