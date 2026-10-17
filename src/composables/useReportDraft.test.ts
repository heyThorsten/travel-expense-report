import { effectScope, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { createEmptyReport, type ActualExpenseDraft } from '../domain/report'
import { useReportDraft } from './useReportDraft'

async function withDraft(test: (draft: ReturnType<typeof useReportDraft>) => void | Promise<void>) {
  const scope = effectScope()
  try {
    await scope.run(() => test(useReportDraft()))
  } finally {
    scope.stop()
  }
}

function expense(id = ''): ActualExpenseDraft {
  return {
    id,
    category: 'transport',
    mode: 'actual',
    date: '2026-10-17',
    description: 'Bahnfahrt',
    amountMinor: 4990,
    receipt: null,
  }
}

describe('useReportDraft', () => {
  it('shows validation only after an attempt and keeps required-field rules', () => withDraft((draft) => {
    expect(draft.personalDetailsErrors.value).toEqual({})
    expect(draft.tripIsValid.value).toBe(false)
    draft.validateReport()
    expect(draft.personalDetailsErrors.value.lastName).toBeTruthy()
    expect(draft.validationErrors.value.purpose).toBeTruthy()
    const stop = draft.report.itineraryStops[0]!
    Object.assign(stop, {
      destination: 'Berlin',
      startAt: '2026-10-17T08:00',
      endAt: '2026-10-17T18:00',
    })
    draft.report.personalDetails.lastName = 'Test'
    draft.report.personalDetails.firstName = 'Person'
    draft.report.trip.purpose = 'Termin'
    expect(draft.tripIsValid.value).toBe(true)
    expect(draft.itineraryErrors.value[stop.id]).toEqual({})
  }))

  it('keeps continuation times linked after edits and removal', () => withDraft(async (draft) => {
    draft.report.itineraryStops[0]!.endAt = '2026-10-17T12:00'
    draft.addItineraryStop()
    draft.report.itineraryStops[1]!.endAt = '2026-10-17T16:00'
    draft.addItineraryStop()
    draft.report.itineraryStops[0]!.endAt = '2026-10-17T13:00'
    await nextTick()
    expect(draft.report.itineraryStops[1]!.startAt).toBe('2026-10-17T13:00')
    expect(draft.report.itineraryStops[2]!.startAt).toBe('2026-10-17T16:00')
    draft.removeItineraryStop(1)
    await nextTick()
    expect(draft.report.itineraryStops[1]!.startAt).toBe('2026-10-17T13:00')
    draft.removeItineraryStop(0)
    expect(draft.report.itineraryStops).toHaveLength(2)
  }))

  it('adds, edits and removes expenses without changing IDs', () => withDraft((draft) => {
    draft.openNewExpense()
    expect(draft.expenseDialog.value).toBe(true)
    draft.saveExpense(expense())
    expect(draft.expenseDialog.value).toBe(false)
    const saved = draft.report.expenses[0]!
    expect(saved.id).toBe('expense-1')
    draft.editExpense(saved)
    expect(draft.editingExpense.value).toBe(saved)
    draft.saveExpense({ ...expense(saved.id), amountMinor: 6000 })
    expect(draft.report.expenses).toHaveLength(1)
    expect(draft.report.expenses[0]).toMatchObject({ id: saved.id, amountMinor: 6000 })
    draft.removeExpense(saved.id)
    expect(draft.report.expenses).toEqual([])
  }))

  it('restores saved fields and continues IDs without collisions', () => withDraft((draft) => {
    const restored = createEmptyReport()
    restored.itineraryStops[0]!.id = 'stop-7'
    restored.expenses = [expense('expense-42')]
    restored.advanceMinor = 1234
    restored.reimbursedMinor = 5678
    draft.validateReport()
    draft.restoreReport(restored)
    expect(draft.validationAttempted.value).toBe(false)
    draft.addItineraryStop()
    draft.saveExpense(expense())
    expect(draft.report.itineraryStops[1]!.id).toBe('stop-8')
    expect(draft.report.expenses[1]!.id).toBe('expense-43')
    expect(draft.report.advanceMinor).toBe(1234)
    expect(draft.report.reimbursedMinor).toBe(5678)
  }))
})
