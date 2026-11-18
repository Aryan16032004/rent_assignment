import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly router = inject(Router);
  private previousPath = '';

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const currentPath = event.urlAfterRedirects.split('?')[0];
        if (this.previousPath && this.previousPath !== currentPath) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        this.previousPath = currentPath;
      });
  }
}
