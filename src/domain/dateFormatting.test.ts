import { describe, expect, it } from 'vitest'
import { formatGermanDateWithWeekday } from './dateFormatting'

describe('formatGermanDateWithWeekday', () => {
  it('formats a date with its weekday without timezone shifts', () => {
    expect(formatGermanDateWithWeekday('2026-10-17')).toBe('Sa., 17.10.2026')
  })

  it('returns an empty string for an empty or malformed date', () => {
    expect(formatGermanDateWithWeekday('')).toBe('')
    expect(formatGermanDateWithWeekday('17.10.2026')).toBe('')
  })
})
