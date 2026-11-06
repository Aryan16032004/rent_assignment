import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = (control.value ?? '').trim();
    if (value.length === 0) {
      return null;
    }
    return PHONE_REGEX.test(value) ? null : { invalidPhone: true };
  };
}
