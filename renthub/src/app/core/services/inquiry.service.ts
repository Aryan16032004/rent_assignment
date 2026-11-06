import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Inquiry, InquiryStatus } from '../models/inquiry.model';

@Injectable({
  providedIn: 'root'
})
export class InquiryService {
  private readonly http = inject(HttpClient);

  sendInquiry(listingId: string, _toUserId: string, message: string): Observable<Inquiry> {
    return this.http.post<Inquiry>(`${API_BASE_URL}/listings/${listingId}/inquiries`, {
      message: message.trim()
    });
  }

  getInquiriesForListing(_listingId: string): Observable<Inquiry[]> {
    return this.getReceived();
  }

  getInquiriesForUser(_userId: string): Observable<Inquiry[]> {
    return forkJoin([this.getReceived(), this.getSent()]).pipe(
      map(([received, sent]) => [...received, ...sent])
    );
  }

  getReceived(): Observable<Inquiry[]> {
    return this.http.get<Inquiry[]>(`${API_BASE_URL}/inquiries/received`);
  }

  getSent(): Observable<Inquiry[]> {
    return this.http.get<Inquiry[]>(`${API_BASE_URL}/inquiries/sent`);
  }

  getById(id: string): Observable<Inquiry> {
    return this.http.get<Inquiry>(`${API_BASE_URL}/inquiries/${id}`);
  }

  reply(inquiryId: string, message: string): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/inquiries/${inquiryId}/messages`, {
      message: message.trim()
    });
  }

  updateStatus(inquiryId: string, status: InquiryStatus): Observable<Inquiry> {
    return this.http.patch<Inquiry>(`${API_BASE_URL}/inquiries/${inquiryId}/status`, {
      status
    });
  }
}
