import { describe, expect, it } from 'vitest'
import { validateExpense } from './expenseValidation'
import type { ExpenseFormValues } from './expenseValidation'

const validExpense: ExpenseFormValues = {
  category: 'transport',
  mode: 'actual',
  date: '2026-10-17',
  description: 'Zugfahrt',
  amount: 42.5,
}

describe('validateExpense', () => {
  it('accepts a complete expense', () => {
    expect(validateExpense(validExpense)).toEqual({})
  })

  it('reports missing and invalid expense values', () => {
    expect(
      validateExpense({
        ...validExpense,
        date: '2026-02-30',
        amount: 1.234,
      }),
    ).toEqual({
      date: 'Bitte ein gültiges Ausgabedatum eingeben.',
      amount:
        'Bitte einen Betrag über 0,00 EUR mit höchstens zwei Nachkommastellen eingeben.',
    })
  })

  it('allows an empty optional description', () => {
    expect(validateExpense({ ...validExpense, description: '' })).toEqual({})
  })

  it('accepts a valid mileage allowance', () => {
    expect(
      validateExpense({
        category: 'transport',
        mode: 'private-car-mileage',
        date: '2026-10-17',
        description: 'Fahrt zum Kundentermin',
        kilometers: 12,
        ratePerKilometer: 0.3,
      }),
    ).toEqual({})
  })

  it('reports invalid mileage and rate values', () => {
    expect(
      validateExpense({
        category: 'transport',
        mode: 'private-car-mileage',
        date: '2026-10-17',
        description: 'Fahrt zum Kundentermin',
        kilometers: -2,
        ratePerKilometer: 0,
      }),
    ).toEqual({
      kilometers: 'Bitte eine gültige ganze Kilometerzahl größer als 0 eingeben.',
      ratePerKilometer: 'Bitte einen Satz pro Kilometer über 0,00 EUR eingeben.',
    })
  })

  it('rejects mileage that would produce an unsafe amount', () => {
    expect(
      validateExpense({
        category: 'transport',
        mode: 'private-car-mileage',
        date: '2026-10-17',
        description: 'Fahrt zum Kundentermin',
        kilometers: 1000000000000,
        ratePerKilometer: 100,
      }),
    ).toEqual({
      kilometers: 'Die gefahrene Strecke ergibt einen nicht darstellbaren Betrag.',
    })
  })
})
