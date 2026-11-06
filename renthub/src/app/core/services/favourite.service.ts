import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Listing } from '../models/listing.model';
import { normalizeListing } from './listing.mapper';

@Injectable({
  providedIn: 'root'
})
export class FavouriteService {
  private readonly http = inject(HttpClient);
  private readonly favouriteIdsSignal = signal<Set<string>>(new Set());
  private readonly favouritesSignal = signal<Listing[]>([]);

  readonly favourites = this.favouritesSignal.asReadonly();

  load(): Observable<Listing[]> {
    return this.http.get<Listing[]>(`${API_BASE_URL}/favourites`).pipe(
      map((items) => items.map(normalizeListing)),
      tap((items) => {
        this.favouritesSignal.set(items);
        this.favouriteIdsSignal.set(new Set(items.map((item) => item.id)));
      })
    );
  }

  getUserFavouriteIds(_userId: string): string[] {
    return [...this.favouriteIdsSignal()];
  }

  isFavourite(userId: string | null | undefined, listingId: string): boolean {
    if (!userId) {
      return false;
    }
    return this.favouriteIdsSignal().has(listingId);
  }

  toggleFavourite(_userId: string, listingId: string): Observable<boolean> {
    const isCurrentlyFavourite = this.favouriteIdsSignal().has(listingId);
    const request = isCurrentlyFavourite
      ? this.http.delete<{ isFavourite: boolean }>(
          `${API_BASE_URL}/listings/${listingId}/favourite`
        )
      : this.http.post<{ isFavourite: boolean }>(
          `${API_BASE_URL}/listings/${listingId}/favourite`,
          {}
        );

    return request.pipe(
      tap(({ isFavourite }) => {
        const next = new Set(this.favouriteIdsSignal());
        if (isFavourite) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        this.favouriteIdsSignal.set(next);
        this.favouritesSignal.update((items) =>
          isFavourite
            ? items
            : items.filter((item) => item.id !== listingId)
        );
      }),
      map(({ isFavourite }) => isFavourite)
    );
  }

  clear(): void {
    this.favouriteIdsSignal.set(new Set());
    this.favouritesSignal.set([]);
  }
}
