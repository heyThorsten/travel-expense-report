import { computed, reactive, ref, watch } from 'vue'
import {
  createEmptyReport,
  DEFAULT_DESTINATION_COUNTRY_CODE,
  type ExpenseDraft,
  type ReportDraft,
} from '../domain/report'
import {
  validateItineraryStop,
  type ItineraryStopValidationErrors,
} from '../domain/itineraryValidation'
import { validatePersonalDetails } from '../domain/personalDetailsValidation'
import { validateTripDetails } from '../domain/tripValidation'

export function useReportDraft() {
  const report = reactive(createEmptyReport())
  const validationAttempted = ref(false)
  const expenseDialog = ref(false)
  const editingExpense = ref<ExpenseDraft | null>(null)
  let nextStopId = 1
  let nextExpenseId = 0

  const validationErrors = computed(() =>
    validationAttempted.value ? validateTripDetails(report.trip) : {},
  )
  const personalDetailsErrors = computed(() =>
    validationAttempted.value ? validatePersonalDetails(report.personalDetails) : {},
  )
  const itineraryErrors = computed(() => {
    const errors: Record<string, ItineraryStopValidationErrors> = {}
    if (validationAttempted.value) {
      report.itineraryStops.forEach((stop, index) => {
        errors[stop.id] = validateItineraryStop(stop, report.itineraryStops[index - 1])
      })
    }
    return errors
  })
  const tripIsValid = computed(
    () =>
      Object.keys(validatePersonalDetails(report.personalDetails)).length === 0 &&
      Object.keys(validateTripDetails(report.trip)).length === 0 &&
      report.itineraryStops.length > 0 &&
      report.itineraryStops.every(
        (stop, index) =>
          Object.keys(validateItineraryStop(stop, report.itineraryStops[index - 1])).length === 0,
      ),
  )

  watch(
    () => report.itineraryStops.map((stop) => stop.endAt),
    (endTimes) => {
      report.itineraryStops.forEach((stop, index) => {
        if (index > 0) stop.startAt = endTimes[index - 1] ?? ''
      })
    },
    { immediate: true },
  )

  function validateReport() {
    validationAttempted.value = true
  }

  function addItineraryStop() {
    report.itineraryStops.push({
      id: `stop-${++nextStopId}`,
      destination: '',
      countryCode: DEFAULT_DESTINATION_COUNTRY_CODE,
      cityOrRegion: '',
      startAt: report.itineraryStops.at(-1)?.endAt ?? '',
      endAt: '',
    })
  }

  function removeItineraryStop(index: number) {
    if (index === 0 || report.itineraryStops.length <= 1) return
    report.itineraryStops.splice(index, 1)
  }

  function openNewExpense() {
    editingExpense.value = null
    expenseDialog.value = true
  }

  function editExpense(expense: ExpenseDraft) {
    editingExpense.value = expense
    expenseDialog.value = true
  }

  function saveExpense(expense: ExpenseDraft) {
    const index = report.expenses.findIndex((existing) => existing.id === expense.id)
    if (index >= 0) {
      report.expenses.splice(index, 1, expense)
    } else {
      report.expenses.push({ ...expense, id: `expense-${++nextExpenseId}` })
    }
    expenseDialog.value = false
    editingExpense.value = null
  }

  function removeExpense(id: string) {
    const index = report.expenses.findIndex((expense) => expense.id === id)
    if (index >= 0) report.expenses.splice(index, 1)
  }

  function restoreReport(restoredReport: ReportDraft) {
    Object.assign(report, restoredReport)
    validationAttempted.value = false
    nextStopId = Math.max(
      1,
      ...report.itineraryStops.flatMap((stop) => {
        const match = /^stop-(\d+)$/.exec(stop.id)
        return match ? [Number(match[1])] : []
      }),
    )
    nextExpenseId = Math.max(
      0,
      ...report.expenses.flatMap((expense) => {
        const match = /^expense-(\d+)$/.exec(expense.id)
        return match ? [Number(match[1])] : []
      }),
    )
  }

  return {
    report,
    validationAttempted,
    validationErrors,
    personalDetailsErrors,
    itineraryErrors,
    tripIsValid,
    expenseDialog,
    editingExpense,
    validateReport,
    addItineraryStop,
    removeItineraryStop,
    openNewExpense,
    editExpense,
    saveExpense,
    removeExpense,
    restoreReport,
  }
}
