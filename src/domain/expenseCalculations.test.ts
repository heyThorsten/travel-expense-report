import { describe, expect, it } from 'vitest'
import { euroNumberToMinorUnits } from './currency'
import {
  expenseAmountMinor,
  groupExpenses,
  sumAmounts,
  transportModeLabel,
} from './expenseCalculations'
import type { ActualExpenseDraft, MileageExpenseDraft } from './report'

function actual(amountMinor: number | null): ActualExpenseDraft {
  return {
    id: 'expense-1',
    category: 'transport',
    mode: 'actual',
    date: '2026-10-17',
    description: '',
    receipt: null,
    amountMinor,
  }
}

function mileage(kilometers: number | null, rate: number | null): MileageExpenseDraft {
  return {
    id: 'expense-2',
    category: 'transport',
    mode: 'private-car-mileage',
    date: '2026-10-18',
    description: '',
    receipt: null,
    mileage: { kilometers, ratePerKilometerMinor: rate },
  }
}

describe('expenseAmountMinor', () => {
  it('keeps actual expenses and mileage in exact minor units', () => {
    expect(expenseAmountMinor(actual(euroNumberToMinorUnits(49.9)))).toBe(4990)
    expect(expenseAmountMinor(mileage(12, 30))).toBe(360)
    expect(expenseAmountMinor(mileage(3, 1))).toBe(3)
    expect(expenseAmountMinor(actual(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('returns null for missing, fractional, unsafe, or invalid mileage amounts', () => {
    for (const amount of [null, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(expenseAmountMinor(actual(amount))).toBeNull()
    }
    for (const expense of [
      mileage(null, 30),
      mileage(12, null),
      mileage(1.5, 30),
      mileage(12, 0),
      mileage(Number.MAX_SAFE_INTEGER, 2),
    ]) {
      expect(expenseAmountMinor(expense)).toBeNull()
    }
  })
})

describe('sumAmounts', () => {
  it('sums exact cents, including an empty list and the safe-integer boundary', () => {
    expect(sumAmounts([])).toBe(0)
    expect(sumAmounts([4990, 360, 1])).toBe(5351)
    expect(sumAmounts([Number.MAX_SAFE_INTEGER - 1, 1])).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('propagates unavailable values and rejects invalid or overflowing totals', () => {
    expect(sumAmounts([1, null])).toBeNull()
    expect(sumAmounts([1, NaN])).toBeNull()
    expect(sumAmounts([1, 0.5])).toBeNull()
    expect(sumAmounts([Number.MAX_SAFE_INTEGER, 1])).toBeNull()
  })
})

describe('groupExpenses', () => {
  it('uses category/date order without changing the input and shares safe totals', () => {
    const first = { ...actual(500), id: 'later', date: '2026-10-18' }
    const second = { ...actual(250), id: 'earlier' }
    const hotel = { ...actual(1000), id: 'hotel', category: 'accommodation' as const }
    const expenses = [hotel, first, second, mileage(12, 30)]
    const groups = groupExpenses(expenses)

    expect(groups.map((group) => group.category)).toEqual(['transport', 'accommodation'])
    expect(groups[0]?.expenses.map((expense) => expense.id)).toEqual(['earlier', 'later', 'expense-2'])
    expect(groups[0]?.totalMinor).toBe(1110)
    expect(groups[1]?.label).toBe('Übernachtung')
    expect(expenses).toEqual([hotel, first, second, mileage(12, 30)])
  })

  it('does not render an overflowing or unavailable group as a valid total', () => {
    expect(groupExpenses([actual(Number.MAX_SAFE_INTEGER), actual(1)])[0]?.totalMinor).toBeNull()
    expect(groupExpenses([actual(1), mileage(null, 30)])[0]?.totalMinor).toBeNull()
    expect(groupExpenses([])).toEqual([])
  })
})

describe('transportModeLabel', () => {
  it('shares transport wording without changing non-transport categories', () => {
    expect(transportModeLabel(actual(100))).toBe('Bahn/Bus/Flugzeug')
    expect(transportModeLabel(mileage(12, 30))).toBe('Privat PKW')
    expect(transportModeLabel({ ...actual(100), category: 'other' })).toBeNull()
  })
})
