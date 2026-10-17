import { describe, expect, it } from 'vitest'
import { createEmptyReport } from './report'

describe('createEmptyReport', () => {
  it('returns a blank report with one destination and no expenses', () => {
    expect(createEmptyReport()).toEqual({
      personalDetails: {
        lastName: '',
        firstName: '',
        personnelNumber: '',
        department: '',
      },
      trip: {
        purpose: '',
      },
      itineraryStops: [
        {
          id: 'stop-1',
          destination: '',
          countryCode: 'DE',
          cityOrRegion: '',
          startAt: '',
          endAt: '',
        },
      ],
      mealSelectionsByDate: {},
      expenses: [],
      advanceMinor: null,
      reimbursedMinor: null,
    })
  })

  it('returns independent drafts', () => {
    const first = createEmptyReport()
    const second = createEmptyReport()

    first.itineraryStops.push({
      id: 'stop-2',
      destination: 'Berlin',
      countryCode: 'DE',
      cityOrRegion: 'Berlin',
      startAt: '',
      endAt: '',
    })

    expect(second.itineraryStops).toEqual([
      {
        id: 'stop-1',
        destination: '',
        countryCode: 'DE',
        cityOrRegion: '',
        startAt: '',
        endAt: '',
      },
    ])
  })
})
