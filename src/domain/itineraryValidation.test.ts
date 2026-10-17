import { describe, expect, it } from 'vitest'
import type { ItineraryStop } from './report'
import { validateItineraryStop } from './itineraryValidation'

const completeStop: ItineraryStop = {
  id: 'stop-1',
  destination: 'Berlin',
  countryCode: 'DE',
  cityOrRegion: '',
  startAt: '2026-10-17T08:00',
  endAt: '2026-10-17T09:00',
}

describe('validateItineraryStop', () => {
  it('requires a destination and a two-letter country code', () => {
    expect(
      validateItineraryStop({
        ...completeStop,
        destination: ' ',
        countryCode: 'Germany',
      }),
    ).toEqual({
      destination: 'Bitte den Ort oder das Reiseziel eingeben.',
      countryCode: 'Bitte einen zweistelligen Ländercode eingeben.',
    })
  })

  it('requires a valid start and end time', () => {
    expect(
      validateItineraryStop({
        ...completeStop,
        startAt: '',
        endAt: '',
      }),
    ).toEqual({
      startAt: 'Bitte die Startzeit eingeben.',
      endAt: 'Bitte die Endzeit eingeben.',
    })
  })

  it('accepts a stop with valid start and end times', () => {
    expect(validateItineraryStop(completeStop)).toEqual({})
  })

  it('requires end to be later than start', () => {
    expect(
      validateItineraryStop({
        ...completeStop,
        startAt: '2026-10-17T12:00',
        endAt: '2026-10-17T12:00',
      }).endAt,
    ).toBe('Das Ende muss nach dem Start liegen.')
  })

  it('requires the next destination to start at the previous end', () => {
    const previousStop = {
      ...completeStop,
      endAt: '2026-10-17T12:00',
    }

    expect(
      validateItineraryStop(
        {
          ...completeStop,
          startAt: '2026-10-17T11:59',
          endAt: '2026-10-17T14:00',
        },
        previousStop,
      ).startAt,
    ).toBe(
      'Der Start muss dem Ende des vorherigen Reiseziels entsprechen.',
    )
  })

  it('allows a destination to start at the previous end', () => {
    const previousStop = {
      ...completeStop,
      endAt: '2026-10-17T12:00',
    }

    expect(
      validateItineraryStop(
        {
          ...completeStop,
          startAt: '2026-10-17T12:00',
          endAt: '2026-10-17T14:00',
        },
        previousStop,
      ),
    ).toEqual({})
  })
})
