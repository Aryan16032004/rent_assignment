import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

export function uniqueEmailAsyncValidator(
  checkIfTaken: (email: string) => Observable<boolean>,
  debounceMs = 300
): AsyncValidatorFn {
  return (control: AbstractControl<string>): Observable<ValidationErrors | null> => {
    const email = (control.value ?? '').trim();

    if (email.length === 0) {
      return of(null);
    }

    return timer(debounceMs).pipe(
      switchMap(() => checkIfTaken(email)),
      map((isTaken) => (isTaken ? { emailTaken: true } : null)),
      catchError(() => of(null))
    );
  };
}
