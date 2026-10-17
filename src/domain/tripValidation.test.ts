import { describe, expect, it } from 'vitest'
import { createEmptyReport } from './report'
import { validateTripDetails } from './tripValidation'

describe('validateTripDetails', () => {
  it('requires a purpose', () => {
    expect(validateTripDetails(createEmptyReport().trip)).toEqual({
      purpose: 'Bitte den Reisezweck eingeben.',
    })
  })

  it('accepts a trip with a purpose', () => {
    const trip = {
      ...createEmptyReport().trip,
      purpose: 'Kundentermin',
    }

    expect(validateTripDetails(trip)).toEqual({})
  })
})
