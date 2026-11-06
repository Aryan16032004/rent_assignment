import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Inquiry, InquiryStatus } from '../models/inquiry.model';

/**
 * Inquiry Service
 * Manages tenant-to-landlord messaging workflows: sending initial inquiries,
 * fetching sent and received inbox messages, conversing via replies, and managing status.
 */
@Injectable({
  providedIn: 'root'
})
export class InquiryService {
  private readonly http = inject(HttpClient);

  /**
   * Submits a new inquiry from an authenticated renter for an apartment listing.
   */
  sendInquiry(listingId: string, _toUserId: string, message: string): Observable<Inquiry> {
    return this.http.post<Inquiry>(`${API_BASE_URL}/listings/${listingId}/inquiries`, {
      message: message.trim()
    });
  }

  /**
   * Fetches all inquiries received by the landlord for their listings.
   */
  getInquiriesForListing(_listingId: string): Observable<Inquiry[]> {
    return this.getReceived();
  }

  /**
   * Fetches all inquiries (both sent and received) involving the current user.
   */
  getInquiriesForUser(_userId: string): Observable<Inquiry[]> {
    return forkJoin([this.getReceived(), this.getSent()]).pipe(
      map(([received, sent]) => [...received, ...sent])
    );
  }

  /**
   * Retrieves all inquiries received by the authenticated user as a landlord.
   */
  getReceived(): Observable<Inquiry[]> {
    return this.http.get<Inquiry[]>(`${API_BASE_URL}/inquiries/received`);
  }

  /**
   * Retrieves all inquiries submitted by the authenticated user as a renter.
   */
  getSent(): Observable<Inquiry[]> {
    return this.http.get<Inquiry[]>(`${API_BASE_URL}/inquiries/sent`);
  }

  /**
   * Retrieves an individual inquiry thread by its unique ID.
   */
  getById(id: string): Observable<Inquiry> {
    return this.http.get<Inquiry>(`${API_BASE_URL}/inquiries/${id}`);
  }

  /**
   * Appends a message reply to an ongoing inquiry conversation thread.
   */
  reply(inquiryId: string, message: string): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/inquiries/${inquiryId}/messages`, {
      message: message.trim()
    });
  }

  /**
   * Updates the lifecycle status of an inquiry ('pending', 'accepted', 'rejected', 'closed').
   */
  updateStatus(inquiryId: string, status: InquiryStatus): Observable<Inquiry> {
    return this.http.patch<Inquiry>(`${API_BASE_URL}/inquiries/${inquiryId}/status`, {
      status
    });
  }
}
