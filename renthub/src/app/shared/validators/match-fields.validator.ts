import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function matchFieldsValidator(
  firstFieldName: string,
  secondFieldName: string,
  errorKey = 'mismatch'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const firstControl = group.get(firstFieldName);
    const secondControl = group.get(secondFieldName);

    if (!firstControl || !secondControl) {
      return null;
    }

    return firstControl.value === secondControl.value ? null : { [errorKey]: true };
  };
}
