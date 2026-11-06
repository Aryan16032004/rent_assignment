import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Listing } from '../models/listing.model';
import { normalizeListing } from './listing.mapper';

/**
 * Favourite Service
 * Reactive state management for saved listings using Angular Signals.
 * Provides instant O(1) favourite lookup via Set<string> signal and syncs with PostgreSQL.
 */
@Injectable({
  providedIn: 'root'
})
export class FavouriteService {
  private readonly http = inject(HttpClient);

  // In-memory set of listing IDs currently marked as favourite
  private readonly favouriteIdsSignal = signal<Set<string>>(new Set());

  // In-memory list of populated favourite listings
  private readonly favouritesSignal = signal<Listing[]>([]);

  /** Readonly signal exposing the user's favourite listings */
  readonly favourites = this.favouritesSignal.asReadonly();

  /**
   * Loads all favourite listings for the authenticated user from `/api/favourites`.
   */
  load(): Observable<Listing[]> {
    return this.http.get<Listing[]>(`${API_BASE_URL}/favourites`).pipe(
      map((items) => items.map(normalizeListing)),
      tap((items) => {
        this.favouritesSignal.set(items);
        this.favouriteIdsSignal.set(new Set(items.map((item) => item.id)));
      })
    );
  }

  /**
   * Returns an array of favourite listing IDs for the given user.
   */
  getUserFavouriteIds(_userId: string): string[] {
    return [...this.favouriteIdsSignal()];
  }

  /**
   * Performs an instant O(1) check to see if a listing is currently marked as favourite.
   */
  isFavourite(userId: string | null | undefined, listingId: string): boolean {
    if (!userId) {
      return false;
    }
    return this.favouriteIdsSignal().has(listingId);
  }

  /**
   * Toggles the favourite state of a listing (POST to add, DELETE to remove).
   * Automatically updates signals reactively on response.
   */
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

  /**
   * Resets local favourite signals when a user logs out.
   */
  clear(): void {
    this.favouriteIdsSignal.set(new Set());
    this.favouritesSignal.set([]);
  }
}
