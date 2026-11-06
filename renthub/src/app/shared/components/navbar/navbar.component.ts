import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly isDark = computed(() => this.themeService.currentTheme() === 'dark');

  readonly guestLinks = computed<NavLink[]>(() => [
    { label: 'Login', path: '/login' },
    { label: 'Register', path: '/register' }
  ]);

  readonly userLinks = computed<NavLink[]>(() => {
    const canHost = this.currentUser()?.role !== 'renter';
    const links: NavLink[] = [{ label: 'Dashboard', path: '/dashboard' }];
    if (canHost) {
      links.push({ label: 'Post Apartment', path: '/listings/new' });
      links.push({ label: 'My Listings', path: '/my-listings' });
    }
    links.push(
      { label: 'Favourites', path: '/favourites' },
      { label: 'Inquiries', path: '/inquiries' },
      { label: 'Profile', path: '/profile' }
    );
    return links;
  });

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/']);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
