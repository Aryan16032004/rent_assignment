import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Listing } from '../models/listing.model';
import { normalizeListing } from './listing.mapper';

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

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${API_BASE_URL}/dashboard`).pipe(
      map((data) => ({
        ...data,
        recentListings: (data.recentListings ?? []).map(normalizeListing)
      }))
    );
  }
}
