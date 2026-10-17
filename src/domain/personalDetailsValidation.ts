import type { PersonalDetails } from './report'

export type PersonalDetailsField =
  | 'lastName'
  | 'firstName'
  | 'personnelNumber'
  | 'department'

export type PersonalDetailsValidationErrors = Partial<
  Record<PersonalDetailsField, string>
>

export function validatePersonalDetails(
  details: PersonalDetails,
): PersonalDetailsValidationErrors {
  const errors: PersonalDetailsValidationErrors = {}

  if (!details.lastName.trim()) {
    errors.lastName = 'Bitte den Nachnamen eingeben.'
  }

  if (!details.firstName.trim()) {
    errors.firstName = 'Bitte den Vornamen eingeben.'
  }

  return errors
}
