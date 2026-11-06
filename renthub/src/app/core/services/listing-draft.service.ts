import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { Listing } from '../models/listing.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ListingDraftService {
  private readonly storageService = inject(StorageService);
  private readonly initialDraft = this.storageService.getItem<Partial<Listing> | null>(
    STORAGE_KEYS.listingDraft,
    null,
    'session'
  );
  private readonly draftSignal = signal<Partial<Listing> | null>(this.initialDraft);

  readonly draft = this.draftSignal.asReadonly();
  readonly hasDraft = computed(() => this.draftSignal() !== null);

  saveDraft(draft: Partial<Listing>): boolean {
    this.draftSignal.set(draft);
    return this.storageService.setItem(STORAGE_KEYS.listingDraft, draft, 'session');
  }

  clearDraft(): boolean {
    this.draftSignal.set(null);
    return this.storageService.removeItem(STORAGE_KEYS.listingDraft, 'session');
  }
}
