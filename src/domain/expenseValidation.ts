import { euroNumberToMinorUnits } from './currency'
import {
  calculateMileageAmountMinor,
  isValidKilometers,
} from './mileage'
import type { ExpenseCategory } from './report'
import { isValidDateTimeLocal } from './tripValidation'

interface ExpenseFormBase {
  category: ExpenseCategory
  date: string
  description: string
}

export interface ActualExpenseFormValues extends ExpenseFormBase {
  mode: 'actual'
  amount: number | null
}

export interface MileageExpenseFormValues extends ExpenseFormBase {
  category: 'transport'
  mode: 'private-car-mileage'
  kilometers: number | null
  ratePerKilometer: number | null
}

export type ExpenseFormValues =
  | ActualExpenseFormValues
  | MileageExpenseFormValues

export type ExpenseField =
  | 'date'
  | 'amount'
  | 'kilometers'
  | 'ratePerKilometer'
export type ExpenseValidationErrors = Partial<Record<ExpenseField, string>>

export function validateExpense(
  expense: ExpenseFormValues,
): ExpenseValidationErrors {
  const errors: ExpenseValidationErrors = {}

  if (!isValidDateTimeLocal(`${expense.date}T00:00`)) {
    errors.date = 'Bitte ein gültiges Ausgabedatum eingeben.'
  }

  if (expense.mode === 'actual') {
    const amountMinor = euroNumberToMinorUnits(expense.amount)
    if (amountMinor === null || amountMinor <= 0) {
      errors.amount =
        'Bitte einen Betrag über 0,00 EUR mit höchstens zwei Nachkommastellen eingeben.'
    }
  } else {
    const kilometers = isValidKilometers(expense.kilometers)
      ? expense.kilometers
      : null
    if (kilometers === null) {
      errors.kilometers =
        'Bitte eine gültige ganze Kilometerzahl größer als 0 eingeben.'
    }

    const rateMinor = euroNumberToMinorUnits(expense.ratePerKilometer)
    if (rateMinor === null || rateMinor <= 0) {
      errors.ratePerKilometer =
        'Bitte einen Satz pro Kilometer über 0,00 EUR eingeben.'
    } else if (
      kilometers !== null &&
      calculateMileageAmountMinor(kilometers, rateMinor) === null
    ) {
      errors.kilometers =
        'Die gefahrene Strecke ergibt einen nicht darstellbaren Betrag.'
    }
  }

  return errors
}
