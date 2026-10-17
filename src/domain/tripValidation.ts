import type { TripDetails } from './report'

export type TripField = 'purpose'
export type TripValidationErrors = Partial<Record<TripField, string>>

export function validateTripDetails(
  trip: TripDetails,
): TripValidationErrors {
  const errors: TripValidationErrors = {}

  if (!trip.purpose.trim()) {
    errors.purpose = 'Bitte den Reisezweck eingeben.'
  }

  return errors
}

export function isValidDateTimeLocal(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false

  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)

  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59) {
    return false
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1]

  return day >= 1 && day <= daysInMonth
}
