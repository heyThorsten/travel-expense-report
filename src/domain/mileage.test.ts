import { describe, expect, it } from 'vitest'
import {
  calculateMileageAmountMinor,
  isValidKilometers,
} from './mileage'

describe('isValidKilometers', () => {
  it('accepts only positive whole distances', () => {
    expect(isValidKilometers(12)).toBe(true)
  })

  it('rejects empty, non-numeric, zero, negative, fractional, and unsafe distances', () => {
    for (const value of [null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(isValidKilometers(value)).toBe(false)
    }
  })
})

describe('calculateMileageAmountMinor', () => {
  it('calculates an amount in cents from whole kilometers and the per-kilometer rate', () => {
    expect(calculateMileageAmountMinor(12, 30)).toBe(360)
  })

  it('rejects fractional kilometer values', () => {
    expect(calculateMileageAmountMinor(0.5, 1)).toBeNull()
  })

  it('rejects invalid distances, rates, and unsafe totals', () => {
    expect(calculateMileageAmountMinor(0, 30)).toBeNull()
    expect(calculateMileageAmountMinor(10, 0)).toBeNull()
    expect(calculateMileageAmountMinor(Number.MAX_VALUE, 30)).toBeNull()
  })
})
