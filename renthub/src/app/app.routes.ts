import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { landlordGuard } from './core/guards/landlord.guard';
import { listingDraftGuard } from './core/guards/listing-draft.guard';
import { ownerGuard } from './core/guards/owner.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { LayoutShellComponent } from './shared/components/layout-shell/layout-shell.component';

export const routes: Routes = [
	{
		path: '',
		component: LayoutShellComponent,
		children: [
			{
				path: '',
				loadComponent: () => import('./features/listings/pages/home/home.component').then((m) => m.HomeComponent)
			},
			{
				path: 'dashboard',
				canActivate: [authGuard],
				loadComponent: () =>
					import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
			},
			{
				path: 'inquiries',
				canActivate: [authGuard],
				loadComponent: () =>
					import('./features/inquiries/inquiries.component').then((m) => m.InquiriesComponent)
			},
			{
				path: 'listings/new',
				canActivate: [authGuard, landlordGuard],
				canDeactivate: [unsavedChangesGuard],
				loadComponent: () =>
					import('./features/listings/pages/listing-form/listing-form.component').then((m) => m.ListingFormComponent)
			},
			{
				path: 'listings/preview',
				canActivate: [authGuard, listingDraftGuard],
				loadComponent: () =>
					import('./features/listings/pages/preview-submit/preview-submit.component').then((m) => m.PreviewSubmitComponent)
			},
			{
				path: 'listings/:id/edit',
				canActivate: [authGuard, ownerGuard],
				canDeactivate: [unsavedChangesGuard],
				loadComponent: () =>
					import('./features/listings/pages/listing-form/listing-form.component').then((m) => m.ListingFormComponent)
			},
			{
				path: 'listings/:id',
				loadComponent: () =>
					import('./features/listings/pages/listing-details/listing-details.component').then((m) => m.ListingDetailsComponent)
			},
			{
				path: 'my-listings',
				canActivate: [authGuard],
				loadComponent: () =>
					import('./features/listings/pages/my-listings/my-listings.component').then((m) => m.MyListingsComponent)
			},
			{
				path: 'favourites',
				canActivate: [authGuard],
				loadComponent: () =>
					import('./features/favourites/pages/favourites/favourites.component').then((m) => m.FavouritesComponent)
			},
			{
				path: 'profile',
				canActivate: [authGuard],
				loadComponent: () => import('./features/profile/pages/profile/profile.component').then((m) => m.ProfileComponent)
			},
			{
				path: 'login',
				canActivate: [guestGuard],
				loadComponent: () => import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent)
			},
			{
				path: 'register',
				canActivate: [guestGuard],
				loadComponent: () => import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent)
			},
			{
				path: '**',
				loadComponent: () => import('./shared/components/not-found/not-found.component').then((m) => m.NotFoundComponent)
			}
		]
	}
];
