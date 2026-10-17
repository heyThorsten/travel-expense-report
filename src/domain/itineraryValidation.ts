import type { ItineraryStop } from './report'
import { isValidDateTimeLocal } from './tripValidation'

export type ItineraryStopField =
  | 'destination'
  | 'countryCode'
  | 'startAt'
  | 'endAt'

export type ItineraryStopValidationErrors = Partial<
  Record<ItineraryStopField, string>
>

export function validateItineraryStop(
  stop: ItineraryStop,
  previousStop?: ItineraryStop,
): ItineraryStopValidationErrors {
  const errors: ItineraryStopValidationErrors = {}

  if (!stop.destination.trim()) {
    errors.destination = 'Bitte den Ort oder das Reiseziel eingeben.'
  }

  if (!/^[a-z]{2}$/i.test(stop.countryCode.trim())) {
    errors.countryCode = 'Bitte einen zweistelligen Ländercode eingeben.'
  }

  if (!stop.startAt) {
    errors.startAt = 'Bitte die Startzeit eingeben.'
  } else if (!isValidDateTimeLocal(stop.startAt)) {
    errors.startAt = 'Bitte eine gültige Startzeit eingeben.'
  }

  if (!stop.endAt) {
    errors.endAt = 'Bitte die Endzeit eingeben.'
  } else if (!isValidDateTimeLocal(stop.endAt)) {
    errors.endAt = 'Bitte eine gültige Endzeit eingeben.'
  }

  if (
    !errors.startAt &&
    !errors.endAt &&
    stop.endAt <= stop.startAt
  ) {
    errors.endAt = 'Das Ende muss nach dem Start liegen.'
  }

  if (
    previousStop &&
    !errors.startAt &&
    isValidDateTimeLocal(previousStop.endAt) &&
    stop.startAt !== previousStop.endAt
  ) {
    errors.startAt =
      'Der Start muss dem Ende des vorherigen Reiseziels entsprechen.'
  }

  return errors
}
