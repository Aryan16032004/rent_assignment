import { CanDeactivateFn } from '@angular/router';

/**
 * Interface implemented by components with unsaved form states.
 */
export interface HasUnsavedChanges {
  hasUnsavedChanges: () => boolean;
}

/**
 * Functional Route Deactivation Guard
 * Prevents accidental loss of unsaved form progress (e.g. while editing an apartment listing).
 * Prompts user for confirmation before abandoning dirty unsaved forms.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  return window.confirm('You have unsaved changes. Do you really want to leave this page?');
};
