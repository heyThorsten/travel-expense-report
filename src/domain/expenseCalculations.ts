import { calculateMileageAmountMinor } from './mileage'
import type { ExpenseCategory, ExpenseDraft } from './report'

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  'transport',
  'accommodation',
  'other',
]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: 'Fahrtkosten',
  accommodation: 'Übernachtung',
  other: 'Reisenebenkosten',
}

export function expenseAmountMinor(expense: ExpenseDraft): number | null {
  if (expense.mode === 'actual') {
    return expense.amountMinor !== null && Number.isSafeInteger(expense.amountMinor)
      ? expense.amountMinor
      : null
  }

  const { kilometers, ratePerKilometerMinor } = expense.mileage
  if (kilometers === null || ratePerKilometerMinor === null) return null
  return calculateMileageAmountMinor(kilometers, ratePerKilometerMinor)
}

export function sumAmounts(amounts: readonly (number | null)[]): number | null {
  let total = 0
  for (const amount of amounts) {
    if (amount === null || !Number.isSafeInteger(amount)) return null
    total += amount
    if (!Number.isSafeInteger(total)) return null
  }
  return total
}

export function groupExpenses(expenses: readonly ExpenseDraft[]) {
  return EXPENSE_CATEGORY_ORDER.map((category) => {
    const categoryExpenses = expenses
      .filter((expense) => expense.category === category)
      .sort((left, right) => left.date.localeCompare(right.date))

    return {
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      expenses: categoryExpenses,
      totalMinor: sumAmounts(categoryExpenses.map(expenseAmountMinor)),
    }
  }).filter((group) => group.expenses.length > 0)
}

export function transportModeLabel(expense: ExpenseDraft): string | null {
  if (expense.category !== 'transport') return null
  return expense.mode === 'private-car-mileage'
    ? 'Privat PKW'
    : 'Bahn/Bus/Flugzeug'
}
