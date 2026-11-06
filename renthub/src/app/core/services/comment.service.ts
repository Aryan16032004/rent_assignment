import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Comment } from '../models/comment.model';

/**
 * Comment Service
 * Manages public apartment Q&A questions and replies.
 * Supports top-level questions and nested 1-level landlord owner replies.
 */
@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private readonly http = inject(HttpClient);

  /**
   * Retrieves all comments and nested replies associated with a listing.
   */
  getForListing(listingId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${API_BASE_URL}/listings/${listingId}/comments`);
  }

  /**
   * Adds a new top-level comment or reply to an existing comment.
   *
   * @param listingId - Target apartment listing ID
   * @param content - Non-empty comment text (1–500 chars)
   * @param parentId - Optional parent comment ID for nested replies
   */
  add(listingId: string, content: string, parentId: string | null = null): Observable<Comment> {
    return this.http.post<Comment>(`${API_BASE_URL}/listings/${listingId}/comments`, {
      content: content.trim(),
      parentId
    });
  }

  /**
   * Deletes a comment (restricted to comment author or listing landlord).
   */
  delete(commentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_BASE_URL}/comments/${commentId}`);
  }
}
