import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  ListingQueryParams,
  PagedResult
} from '../models/listing-query.model';
import { Listing, ListingStatus } from '../models/listing.model';
import { normalizeListing } from './listing.mapper';

/**
 * Listing Service
 * Facilitates all apartment listing operations: querying with faceted search filters,
 * fetching featured listings, creating, updating, deleting, and uploading property media.
 */
@Injectable({
  providedIn: 'root'
})
export class ListingService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches all published listings up to default page size (50).
   */
  getAll(): Observable<Listing[]> {
    const params = new HttpParams().set('pageSize', '50');
    return this.http
      .get<PagedResult<Listing>>(`${API_BASE_URL}/listings`, { params })
      .pipe(map((result) => result.items.map(normalizeListing)));
  }

  /**
   * Fetches featured spotlight listings for the home screen carousel.
   */
  getFeatured(): Observable<Listing[]> {
    return this.http
      .get<Listing[]>(`${API_BASE_URL}/listings/featured`)
      .pipe(map((items) => items.map(normalizeListing)));
  }

  /**
   * Fetches a single listing by its unique identifier.
   */
  getById(id: string): Observable<Listing | null> {
    return this.http
      .get<Listing>(`${API_BASE_URL}/listings/${id}`)
      .pipe(map(normalizeListing));
  }

  /**
   * Fetches all listings owned by a specific landlord.
   */
  getByOwner(_ownerId: string): Observable<Listing[]> {
    return this.getMine();
  }

  /**
   * Fetches all listings owned by the currently authenticated landlord.
   */
  getMine(): Observable<Listing[]> {
    return this.http
      .get<Listing[]>(`${API_BASE_URL}/listings/mine`)
      .pipe(map((items) => items.map(normalizeListing)));
  }

  /**
   * Fetches all listings marked as favourite by the user.
   */
  getFavourites(_userId: string): Observable<Listing[]> {
    return this.http
      .get<Listing[]>(`${API_BASE_URL}/favourites`)
      .pipe(map((items) => items.map(normalizeListing)));
  }

  /**
   * Queries listings with dynamic faceted filters: location, price range, bedrooms,
   * lease type, furnished status, vegetarian preference, amenities, sorting, and pagination.
   */
  queryListings(params: ListingQueryParams): Observable<PagedResult<Listing>> {
    let httpParams = new HttpParams();
    const append = (key: string, value: string | number | undefined | null) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    };

    append('q', params.searchTerm);
    append('city', params.city);
    append('minPrice', params.minPrice);
    append('maxPrice', params.maxPrice);
    append('bedrooms', params.bedrooms);
    append('propertyType', (params as { propertyType?: string }).propertyType);
    append(
      'leaseType',
      params.leaseType && params.leaseType !== 'all' ? params.leaseType : undefined
    );
    append('furnished', params.furnished !== 'all' ? params.furnished : undefined);
    append(
      'vegetarian',
      params.vegetarianPreference !== 'all' ? params.vegetarianPreference : undefined
    );
    append('amenities', params.amenities?.length ? params.amenities.join(',') : undefined);
    append('sort', params.sort);
    append('page', params.page);
    append('pageSize', params.pageSize);

    return this.http
      .get<PagedResult<Listing>>(`${API_BASE_URL}/listings`, { params: httpParams })
      .pipe(
        map((result) => ({
          ...result,
          items: result.items.map(normalizeListing)
        }))
      );
  }

  /**
   * Publishes a new apartment listing.
   */
  create(
    listingData: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>
  ): Observable<Listing> {
    return this.http
      .post<Listing>(`${API_BASE_URL}/listings`, listingData)
      .pipe(map(normalizeListing));
  }

  /**
   * Updates fields on an existing apartment listing.
   */
  update(id: string, updates: Partial<Listing>): Observable<Listing> {
    return this.http
      .patch<Listing>(`${API_BASE_URL}/listings/${id}`, updates)
      .pipe(map(normalizeListing));
  }

  /**
   * Updates listing visibility status ('draft', 'pending', 'published', 'rented', 'inactive').
   */
  updateStatus(id: string, status: ListingStatus): Observable<Listing> {
    return this.http
      .patch<Listing>(`${API_BASE_URL}/listings/${id}/status`, { status })
      .pipe(map(normalizeListing));
  }

  /**
   * Deletes an apartment listing and its associated database records and images.
   */
  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE_URL}/listings/${id}`);
  }

  /**
   * Uploads multipart image files to Cloudinary for a listing.
   */
  uploadImages(id: string, files: File[]): Observable<Listing> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }
    return this.http
      .post<Listing>(`${API_BASE_URL}/listings/${id}/images`, formData)
      .pipe(map(normalizeListing));
  }

  /**
   * Deletes a specific image from a listing and removes it from storage.
   */
  deleteImage(listingId: string, imageId: string): Observable<Listing> {
    return this.http
      .delete<Listing>(`${API_BASE_URL}/listings/${listingId}/images/${imageId}`)
      .pipe(map(normalizeListing));
  }
}
