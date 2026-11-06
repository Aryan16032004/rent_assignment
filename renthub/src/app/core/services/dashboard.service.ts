import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Listing } from '../models/listing.model';
import { normalizeListing } from './listing.mapper';

/**
 * Structured metrics payload returned by the `/api/dashboard` endpoint.
 */
export interface DashboardData {
  listings: Record<string, number>;
  favourites: number;
  inquiries: Record<string, number>;
  recentListings: Listing[];
  recentInquiries: {
    id: string;
    listingTitle: string;
    senderName: string;
    status: string;
    createdAt: string;
  }[];
}

/**
 * Dashboard Service
 * Fetches aggregated statistics, listing counts by status, inquiry counters,
 * and recent activity for the landlord / host control panel.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  /**
   * Retrieves dashboard statistics and normalizes any recent listing image URLs.
   */
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${API_BASE_URL}/dashboard`).pipe(
      map((data) => ({
        ...data,
        recentListings: (data.recentListings ?? []).map(normalizeListing)
      }))
    );
  }
}
