import { describe, expect, it } from 'vitest'
import { euroNumberToMinorUnits, formatEuroCurrency } from './currency'

describe('euroNumberToMinorUnits', () => {
  it('converts numeric euro values into cents at two-digit precision', () => {
    expect(euroNumberToMinorUnits(12.34)).toBe(1234)
    expect(euroNumberToMinorUnits(12.3)).toBe(1230)
    expect(euroNumberToMinorUnits(12)).toBe(1200)
  })

  it('rejects null, negative, non-finite, and unsafe values', () => {
    expect(euroNumberToMinorUnits(null)).toBeNull()
    expect(euroNumberToMinorUnits(-1)).toBeNull()
    expect(euroNumberToMinorUnits(1.234)).toBeNull()
    expect(euroNumberToMinorUnits(Number.NaN)).toBeNull()
    expect(euroNumberToMinorUnits(Number.POSITIVE_INFINITY)).toBeNull()
    expect(euroNumberToMinorUnits(Number.MAX_VALUE)).toBeNull()
  })

  it('formats minor units as German euro currency', () => {
    expect(formatEuroCurrency(1234)).toBe('12,34 €')
  })
})
