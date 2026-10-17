import { describe, expect, it } from 'vitest'
import type { DestinationCountryOption } from './destinationOptions'
import type { ItineraryStop, MealSelections } from './report'
import {
  calculateMealAllowanceDays,
  calculateMealDeduction,
} from './mealAllowance'

const germany: DestinationCountryOption = {
  code: 'DE',
  name: 'Deutschland',
  regions: [],
  rates: [
    {
      validFrom: '2023-01-01',
      validUntil: null,
      catering8Minor: 1400,
      catering24Minor: 2800,
      specials: [],
    },
  ],
}

const stop: ItineraryStop = {
  id: 'stop-1',
  destination: 'Berlin',
  countryCode: 'DE',
  cityOrRegion: '',
  startAt: '2026-10-17T08:00',
  endAt: '2026-10-17T16:00',
}

describe('calculateMealAllowanceDays', () => {
  it('does not create a row for exactly eight hours', () => {
    expect(
      calculateMealAllowanceDays(
        [{ ...stop, endAt: '2026-10-17T16:00' }],
        [germany],
        {},
      ),
    ).toEqual([])
  })

  it('creates a reduced-rate row only after more than eight hours', () => {
    const days = calculateMealAllowanceDays(
      [{ ...stop, endAt: '2026-10-17T16:01' }],
      [germany],
      {},
    )

    expect(days).toHaveLength(1)
    expect(days[0]).toMatchObject({
      date: '2026-10-17',
      kind: 'short',
      baseAmountMinor: 1400,
      payableAmountMinor: 1400,
    })
  })

  it('uses reduced rates on travel days and the full rate on intervening days', () => {
    const days = calculateMealAllowanceDays(
      [
        { ...stop, endAt: '2026-10-18T09:00' },
        {
          ...stop,
          id: 'stop-2',
          destination: 'München',
          startAt: '2026-10-18T09:00',
          endAt: '2026-10-20T18:00',
        },
      ],
      [germany],
      {},
    )

    expect(days.map(({ date, kind, baseAmountMinor }) => ({
      date,
      kind,
      baseAmountMinor,
    }))).toEqual([
      { date: '2026-10-17', kind: 'short', baseAmountMinor: 1400 },
      { date: '2026-10-18', kind: 'full', baseAmountMinor: 2800 },
      { date: '2026-10-19', kind: 'full', baseAmountMinor: 2800 },
      { date: '2026-10-20', kind: 'short', baseAmountMinor: 1400 },
    ])
  })

  it('uses the full rate for every calendar day of complete absence', () => {
    const days = calculateMealAllowanceDays(
      [{ ...stop, startAt: '2026-10-17T00:00', endAt: '2026-10-18T12:00' }],
      [germany],
      {},
    )

    expect(days.map(({ date, kind, baseAmountMinor }) => ({
      date,
      kind,
      baseAmountMinor,
    }))).toEqual([
      { date: '2026-10-17', kind: 'full', baseAmountMinor: 2800 },
      { date: '2026-10-18', kind: 'short', baseAmountMinor: 1400 },
    ])
  })

  it('deducts provided meals from the actual daily allowance without going below zero', () => {
    const selections: MealSelections = {
      breakfast: true,
      lunch: true,
      dinner: true,
    }
    const [day] = calculateMealAllowanceDays(
      [{ ...stop, endAt: '2026-10-17T18:00' }],
      [germany],
      { '2026-10-17': selections },
    )

    expect(day).toMatchObject({
      baseAmountMinor: 1400,
      deductionMinor: 1400,
      payableAmountMinor: 0,
    })
    expect(calculateMealDeduction(1400, selections)).toBe(1400)
  })

  it('calculates meal reductions from the reduced 8-hour rate', () => {
    const [day] = calculateMealAllowanceDays(
      [{ ...stop, endAt: '2026-10-17T18:00' }],
      [germany],
      {
        '2026-10-17': {
          breakfast: true,
          lunch: false,
          dinner: false,
        },
      },
    )

    expect(day).toMatchObject({
      baseAmountMinor: 1400,
      deductionMinor: 280,
      payableAmountMinor: 1120,
    })
  })

  it('uses a date-specific regional rate when one is available', () => {
    const country: DestinationCountryOption = {
      ...germany,
      code: 'AU',
      name: 'Australien',
      regions: ['Sydney'],
      rates: [
        {
          validFrom: '2026-01-01',
          validUntil: null,
          catering8Minor: 3200,
          catering24Minor: 4800,
          specials: [
            {
              city: 'Sydney',
              catering8Minor: 4000,
              catering24Minor: 6000,
            },
          ],
        },
      ],
    }

    const [day] = calculateMealAllowanceDays(
      [
        {
          ...stop,
          countryCode: 'AU',
          cityOrRegion: 'Sydney',
          endAt: '2026-10-17T18:00',
        },
      ],
      [country],
      {},
    )

    expect(day?.baseAmountMinor).toBe(4000)
  })

  it('reports a missing rate instead of substituting a different rate', () => {
    const [day] = calculateMealAllowanceDays(
      [{ ...stop, countryCode: 'US', endAt: '2026-10-17T18:00' }],
      [germany],
      {},
    )

    expect(day?.baseAmountMinor).toBeNull()
    expect(day?.payableAmountMinor).toBeNull()
  })

  it('does not calculate rows when destination timestamps are incomplete', () => {
    expect(
      calculateMealAllowanceDays(
        [{ ...stop, startAt: '' }],
        [germany],
        {},
      ),
    ).toEqual([])
  })
})
