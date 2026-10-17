import bundledDestinationOptions from './destinationOptionsSnapshot.json'

export interface DestinationCountryOption {
  code: string
  name: string
  regions: string[]
  rates: DestinationRatePeriod[]
}

export interface DestinationRatePeriod {
  validFrom: string
  validUntil: string | null
  catering8Minor: number
  catering24Minor: number
  specials: DestinationSpecialRate[]
}

export interface DestinationSpecialRate {
  city: string
  catering8Minor: number
  catering24Minor: number
}

export interface DestinationOptionsLoadResult {
  countries: DestinationCountryOption[]
  source: 'bundle' | 'cache' | 'network'
  notice: string | null
}

interface ApiPeriod {
  validFrom: string
  validUntil: string | null
  data: ApiCountry[]
}

interface ApiCountry {
  countryCode: string
  catering8: number
  catering24: number
  specials: ApiSpecial[]
}

interface ApiSpecial {
  city: string
  catering8: number
  catering24: number
}

const destinationApiUrl =
  'https://cdn.jsdelivr.net/npm/pauschbetrag-api@1/ALL.json'
export const DESTINATION_OPTIONS_CACHE_KEY =
  'travel-expense-report.destination-options.v1'

export async function loadDestinationOptions(): Promise<DestinationOptionsLoadResult> {
  const cached = readCachedDestinationOptions()

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (cached.countries) {
      return {
        countries: cached.countries,
        source: 'cache',
        notice: 'Keine Internetverbindung. Gespeicherte Daten werden verwendet.',
      }
    }

    return {
      countries: parseDestinationOptions(bundledDestinationOptions),
      source: 'bundle',
      notice: 'Keine Internetverbindung. Mitgelieferte Länderoptionen werden verwendet.',
    }
  }

  try {
    const response = await fetch(destinationApiUrl, { cache: 'no-cache' })
    if (!response.ok) {
      throw new Error(
        `Die Länderliste konnte nicht geladen werden (HTTP ${response.status}).`,
      )
    }

    const payload: unknown = await response.json()
    const countries = parseDestinationOptions(payload)

    try {
      localStorage.setItem(
        DESTINATION_OPTIONS_CACHE_KEY,
        JSON.stringify(payload),
      )
    } catch (error) {
      return {
        countries,
        source: 'network',
        notice: `Die aktuellen Länderoptionen konnten nicht für die Offline-Nutzung gespeichert werden: ${errorMessage(error)}`,
      }
    }

    return { countries, source: 'network', notice: null }
  } catch (error) {
    if (cached.countries) {
      return {
        countries: cached.countries,
        source: 'cache',
        notice: `Die aktuellen Länderoptionen konnten nicht geladen werden. Gespeicherte Daten werden verwendet. (${errorMessage(error)})`,
      }
    }

    const cacheNotice = cached.error
      ? ` Der lokale Speicher ist nicht verwendbar: ${cached.error}`
      : ''
    return {
      countries: parseDestinationOptions(bundledDestinationOptions),
      source: 'bundle',
      notice: `Die aktuellen Länderoptionen konnten nicht geladen werden. Mitgelieferte Daten werden verwendet. (${errorMessage(error)})${cacheNotice}`,
    }
  }
}

function readCachedDestinationOptions(): {
  countries?: DestinationCountryOption[]
  error?: string
} {
  try {
    const cachedPayload = localStorage.getItem(DESTINATION_OPTIONS_CACHE_KEY)
    if (cachedPayload === null) return {}

    return { countries: parseDestinationOptions(JSON.parse(cachedPayload)) }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler.'
}

export function parseDestinationOptions(
  payload: unknown,
): DestinationCountryOption[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error('Die Länderliste hat ein unerwartetes Format.')
  }

  const periods = payload.map(parsePeriod)
  const latestPeriod = periods.reduce((latest, period) =>
    period.validFrom > latest.validFrom ? period : latest,
  )
  if (latestPeriod.data.length === 0) {
    throw new Error('Die Länderliste enthält keine auswählbaren Länder.')
  }

  const countryNames = new Intl.DisplayNames(['de-DE'], { type: 'region' })

  return latestPeriod.data
    .map((country) => {
      const countryPeriods = periods.flatMap((period) => {
        const entry = period.data.find(
          (item) => item.countryCode === country.countryCode,
        )
        return entry
          ? [
              {
                validFrom: period.validFrom,
                validUntil: period.validUntil,
                catering8Minor: toMinorUnits(entry.catering8),
                catering24Minor: toMinorUnits(entry.catering24),
                specials: entry.specials.map((special) => ({
                  city: special.city,
                  catering8Minor: toMinorUnits(special.catering8),
                  catering24Minor: toMinorUnits(special.catering24),
                })),
              },
            ]
          : []
      })

      return {
        code: country.countryCode,
        name: countryNames.of(country.countryCode) ?? country.countryCode,
        regions: [
          ...new Set(country.specials.map((special) => special.city)),
        ].sort((left, right) => left.localeCompare(right, 'de')),
        rates: countryPeriods,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'de'))
}

function parsePeriod(value: unknown): ApiPeriod {
  if (
    !isRecord(value) ||
    typeof value.validFrom !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.validFrom) ||
    !(value.validUntil === null ||
      (typeof value.validUntil === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value.validUntil))) ||
    !Array.isArray(value.data)
  ) {
    throw new Error('Die Länderliste hat ein unerwartetes Format.')
  }

  return {
    validFrom: value.validFrom,
    validUntil: value.validUntil,
    data: value.data.map(parseCountry),
  }
}

function parseCountry(value: unknown): ApiCountry {
  if (
    !isRecord(value) ||
    typeof value.countryCode !== 'string' ||
    !/^[a-z]{2}$/i.test(value.countryCode) ||
    !isNonNegativeNumber(value.catering8) ||
    !isNonNegativeNumber(value.catering24) ||
    !Array.isArray(value.specials)
  ) {
    throw new Error('Ein Land in der Liste hat ein unerwartetes Format.')
  }

  return {
    countryCode: value.countryCode.toUpperCase(),
    catering8: value.catering8,
    catering24: value.catering24,
    specials: value.specials.map(parseSpecial),
  }
}

function parseSpecial(value: unknown): ApiSpecial {
  if (
    !isRecord(value) ||
    typeof value.city !== 'string' ||
    !value.city.trim() ||
    !isNonNegativeNumber(value.catering8) ||
    !isNonNegativeNumber(value.catering24)
  ) {
    throw new Error('Eine Region in der Liste hat ein unerwartetes Format.')
  }

  return {
    city: value.city.trim(),
    catering8: value.catering8,
    catering24: value.catering24,
  }
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
