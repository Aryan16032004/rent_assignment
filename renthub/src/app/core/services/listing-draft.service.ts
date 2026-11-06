import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { Listing } from '../models/listing.model';
import { StorageService } from './storage.service';

/**
 * Listing Draft Service
 * Persists in-progress listing creation state in sessionStorage.
 * Bridges the multi-step flow between the creation form (`/listings/new`)
 * and the review screen (`/listings/preview`) without losing form inputs.
 */
@Injectable({
  providedIn: 'root'
})
export class ListingDraftService {
  private readonly storageService = inject(StorageService);

  // Restore existing session draft on service instantiation
  private readonly initialDraft = this.storageService.getItem<Partial<Listing> | null>(
    STORAGE_KEYS.listingDraft,
    null,
    'session'
  );

  // Reactive draft signal
  private readonly draftSignal = signal<Partial<Listing> | null>(this.initialDraft);

  /** Readonly signal exposing the current draft */
  readonly draft = this.draftSignal.asReadonly();

  /** Computed signal indicating whether a valid draft currently exists */
  readonly hasDraft = computed(() => this.draftSignal() !== null);

  /**
   * Persists draft listing data in both memory signal and sessionStorage.
   */
  saveDraft(draft: Partial<Listing>): boolean {
    this.draftSignal.set(draft);
    return this.storageService.setItem(STORAGE_KEYS.listingDraft, draft, 'session');
  }

  /**
   * Clears the draft after successful publication or explicit cancellation.
   */
  clearDraft(): boolean {
    this.draftSignal.set(null);
    return this.storageService.removeItem(STORAGE_KEYS.listingDraft, 'session');
  }
}
