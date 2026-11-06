import { Injectable } from '@angular/core';

export type StorageKind = 'local' | 'session';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly isBrowser = typeof window !== 'undefined';

  getItem<T>(key: string, fallback: T, storageKind: StorageKind = 'local'): T {
    if (!this.isBrowser) {
      return fallback;
    }

    try {
      const storage = this.resolveStorage(storageKind);
      const rawValue = storage.getItem(key);
      if (!rawValue) {
        return fallback;
      }

      return JSON.parse(rawValue) as T;
    } catch {
      return fallback;
    }
  }

  setItem<T>(key: string, value: T, storageKind: StorageKind = 'local'): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      this.resolveStorage(storageKind).setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`StorageService: failed to write key "${key}" to ${storageKind}Storage`, err);
      return false;
    }
  }

  removeItem(key: string, storageKind: StorageKind = 'local'): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      this.resolveStorage(storageKind).removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  private resolveStorage(storageKind: StorageKind): Storage {
    return storageKind === 'session' ? window.sessionStorage : window.localStorage;
  }
}
