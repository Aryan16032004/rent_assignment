import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Comment } from '../models/comment.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private readonly http = inject(HttpClient);

  getForListing(listingId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${API_BASE_URL}/listings/${listingId}/comments`);
  }

  add(listingId: string, content: string, parentId: string | null = null): Observable<Comment> {
    return this.http.post<Comment>(`${API_BASE_URL}/listings/${listingId}/comments`, {
      content: content.trim(),
      parentId
    });
  }

  delete(commentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE_URL}/comments/${commentId}`);
  }
}
