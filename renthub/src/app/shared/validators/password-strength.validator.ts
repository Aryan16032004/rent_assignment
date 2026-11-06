import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value ?? '';

    if (value.length === 0) {
      return null;
    }

    return PASSWORD_STRENGTH_REGEX.test(value) ? null : { passwordStrength: true };
  };
}
