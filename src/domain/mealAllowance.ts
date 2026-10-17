import type {
  DestinationCountryOption,
  DestinationRatePeriod,
} from './destinationOptions'
import { isValidDateTimeLocal } from './tripValidation'
import type { ItineraryStop, MealSelections } from './report'

export type MealAllowanceDayKind = 'short' | 'full'

export interface MealAllowanceDay {
  date: string
  kind: MealAllowanceDayKind
  countryCode: string
  countryName: string
  region: string
  baseAmountMinor: number | null
  deductionMinor: number
  payableAmountMinor: number | null
}

const BREAKFAST_REDUCTION = 0.2
const OTHER_MEAL_REDUCTION = 0.4
const HOURS_PER_SHORT_DAY = 8

export function calculateMealAllowanceDays(
  stops: ItineraryStop[],
  countries: DestinationCountryOption[],
  selections: Record<string, MealSelections>,
): MealAllowanceDay[] {
  const firstStop = stops[0]
  const lastStop = stops.at(-1)
  if (
    !firstStop ||
    !lastStop ||
    stops.some(
      (stop, index) =>
        !isValidDateTimeLocal(stop.startAt) ||
        !isValidDateTimeLocal(stop.endAt) ||
        stop.endAt <= stop.startAt ||
        (index > 0 && stop.startAt !== stops[index - 1]?.endAt),
    )
  ) {
    return []
  }

  const start = new Date(firstStop.startAt)
  const end = new Date(lastStop.endAt)
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return []
  }

  const firstDate = firstStop.startAt.slice(0, 10)
  const lastDate = lastStop.endAt.slice(0, 10)
  const isSingleDay = firstDate === lastDate
  if (
    isSingleDay &&
    end.getTime() - start.getTime() <=
      HOURS_PER_SHORT_DAY * 60 * 60 * 1000
  ) {
    return []
  }

  const dates = listDates(firstDate, lastDate)

  return dates.map((date) => {
    const kind: MealAllowanceDayKind = isFullCalendarDay(start, end, date)
      ? 'full'
      : 'short'
    const stop = stopForDate(stops, date)
    const country = countries.find(
      (option) => option.code === stop.countryCode,
    )
    const period = ratePeriodForDate(country?.rates, date)
    const regionalRate = period?.specials.find(
      (special) => special.city === stop.cityOrRegion,
    )
    const rate = regionalRate ?? period
    const baseAmountMinor =
      rate?.[kind === 'full' ? 'catering24Minor' : 'catering8Minor'] ?? null
    const selection = selections[date]
    const deductionMinor =
      baseAmountMinor === null
        ? 0
        : calculateMealDeduction(baseAmountMinor, selection)

    return {
      date,
      kind,
      countryCode: stop.countryCode,
      countryName: country?.name ?? stop.countryCode,
      region: stop.cityOrRegion,
      baseAmountMinor,
      deductionMinor,
      payableAmountMinor:
        baseAmountMinor === null
          ? null
          : Math.max(0, baseAmountMinor - deductionMinor),
    }
  })
}

export function calculateMealDeduction(
  fullDayAmountMinor: number,
  selections: MealSelections | undefined,
): number {
  if (!selections) return 0

  const breakfast = selections.breakfast
    ? Math.round(fullDayAmountMinor * BREAKFAST_REDUCTION)
    : 0
  const lunch = selections.lunch
    ? Math.round(fullDayAmountMinor * OTHER_MEAL_REDUCTION)
    : 0
  const dinner = selections.dinner
    ? Math.round(fullDayAmountMinor * OTHER_MEAL_REDUCTION)
    : 0

  return breakfast + lunch + dinner
}

function listDates(firstDate: string, lastDate: string): string[] {
  const dates: string[] = []
  const current = new Date(`${firstDate}T00:00:00Z`)
  const last = new Date(`${lastDate}T00:00:00Z`)

  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

function isFullCalendarDay(start: Date, end: Date, date: string): boolean {
  const dayStart = new Date(`${date}T00:00`)
  const nextDayStart = new Date(dayStart)
  nextDayStart.setDate(nextDayStart.getDate() + 1)

  return start <= dayStart && end >= nextDayStart
}

function stopForDate(stops: ItineraryStop[], date: string): ItineraryStop {
  const lastActiveStop = stops
    .filter((stop) => stop.startAt.slice(0, 10) <= date)
    .at(-1)
  return lastActiveStop ?? stops[0]!
}

function ratePeriodForDate(
  rates: DestinationRatePeriod[] | undefined,
  date: string,
): DestinationRatePeriod | undefined {
  return rates?.find(
    (period) =>
      period.validFrom <= date &&
      (period.validUntil === null || period.validUntil >= date),
  )
}
