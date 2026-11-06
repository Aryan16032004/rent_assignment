import { Injectable, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { StorageService } from './storage.service';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageService = inject(StorageService);
  private readonly isBrowser = typeof window !== 'undefined';
  private readonly savedTheme = this.storageService.getItem<ThemeMode>(STORAGE_KEYS.theme, 'light');

  readonly currentTheme = signal<ThemeMode>(this.savedTheme);

  constructor() {
    this.applyTheme(this.savedTheme);
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.currentTheme.set(nextTheme);
    this.storageService.setItem(STORAGE_KEYS.theme, nextTheme);
    this.applyTheme(nextTheme);
  }

  private applyTheme(theme: ThemeMode): void {
    if (!this.isBrowser) {
      return;
    }

    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}
