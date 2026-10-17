export type ExpenseCategory =
  | 'transport'
  | 'accommodation'
  | 'other'

export interface PersonalDetails {
  lastName: string
  firstName: string
  personnelNumber: string
  department: string
}

export const DEFAULT_DESTINATION_COUNTRY_CODE = 'DE'

export interface TripDetails {
  purpose: string
}

export interface ItineraryStop {
  id: string
  destination: string
  countryCode: string
  cityOrRegion: string
  startAt: string
  endAt: string
}

export interface MealSelections {
  breakfast: boolean
  lunch: boolean
  dinner: boolean
}

export interface MileageDetails {
  kilometers: number | null
  ratePerKilometerMinor: number | null
}

export type ReceiptMediaType = 'application/pdf' | 'image/jpeg' | 'image/png'

export interface ReceiptAttachment {
  file: File
  mediaType: ReceiptMediaType
}

interface ExpenseDraftBase {
  id: string
  date: string
  description: string
  receipt: ReceiptAttachment | null
}

export interface ActualExpenseDraft extends ExpenseDraftBase {
  category: ExpenseCategory
  mode: 'actual'
  amountMinor: number | null
}

export interface MileageExpenseDraft extends ExpenseDraftBase {
  category: 'transport'
  mode: 'private-car-mileage'
  mileage: MileageDetails
}

export type ExpenseDraft = ActualExpenseDraft | MileageExpenseDraft

export interface ReportDraft {
  personalDetails: PersonalDetails
  trip: TripDetails
  itineraryStops: ItineraryStop[]
  mealSelectionsByDate: Record<string, MealSelections>
  excludedMealAllowanceDates: string[]
  expenses: ExpenseDraft[]
  advanceMinor: number | null
  reimbursedMinor: number | null
}

export function createEmptyReport(): ReportDraft {
  return {
    personalDetails: {
      lastName: '',
      firstName: '',
      personnelNumber: '',
      department: '',
    },
    trip: {
      purpose: '',
    },
    itineraryStops: [
      {
        id: 'stop-1',
        destination: '',
        countryCode: DEFAULT_DESTINATION_COUNTRY_CODE,
        cityOrRegion: '',
        startAt: '',
        endAt: '',
      },
    ],
    mealSelectionsByDate: {},
    excludedMealAllowanceDates: [],
    expenses: [],
    advanceMinor: null,
    reimbursedMinor: null,
  }
}
