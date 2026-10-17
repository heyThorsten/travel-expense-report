import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DESTINATION_OPTIONS_CACHE_KEY,
  loadDestinationOptions,
  parseDestinationOptions,
} from './destinationOptions'

const apiPayload = [
  {
    validFrom: '2026-01-01',
    validUntil: null,
    data: [
      {
        countryCode: 'DE',
        catering8: 14,
        catering24: 28,
        specials: [],
      },
    ],
  },
]

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseDestinationOptions', () => {
  it('uses the latest period and maps its special cities to regions', () => {
    const options = parseDestinationOptions([
      {
        validFrom: '2025-01-01',
        validUntil: '2025-12-31',
        data: [
          {
            countryCode: 'AU',
            catering8: 30,
            catering24: 45,
            specials: [{ city: 'Sydney', catering8: 40, catering24: 60 }],
          },
        ],
      },
      {
        validFrom: '2026-01-01',
        validUntil: null,
        data: [
          {
            countryCode: 'AU',
            catering8: 32,
            catering24: 48,
            specials: [
              { city: 'Canberra', catering8: 40, catering24: 60 },
              { city: 'Sydney', catering8: 40, catering24: 60 },
            ],
          },
        ],
      },
    ])

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      code: 'AU',
      regions: ['Canberra', 'Sydney'],
      rates: [
        {
          validFrom: '2025-01-01',
          validUntil: '2025-12-31',
          catering8Minor: 3000,
          catering24Minor: 4500,
          specials: [
            {
              city: 'Sydney',
              catering8Minor: 4000,
              catering24Minor: 6000,
            },
          ],
        },
        {
          validFrom: '2026-01-01',
          validUntil: null,
          catering8Minor: 3200,
          catering24Minor: 4800,
          specials: [
            {
              city: 'Canberra',
              catering8Minor: 4000,
              catering24Minor: 6000,
            },
            {
              city: 'Sydney',
              catering8Minor: 4000,
              catering24Minor: 6000,
            },
          ],
        },
      ],
    })
    expect(options[0]?.name).toBeTruthy()
  })

  it('rejects an unexpected API response shape', () => {
    expect(() => parseDestinationOptions({ data: [] })).toThrow(
      'Die Länderliste hat ein unerwartetes Format.',
    )
  })

  it('rejects a latest period without any selectable countries', () => {
    expect(() =>
      parseDestinationOptions([
        {
          validFrom: '2026-01-01',
          validUntil: null,
          data: [],
        },
      ]),
    ).toThrow('Die Länderliste enthält keine auswählbaren Länder.')
  })

  it('uses saved data offline without making a network request', async () => {
    const storage = new MemoryStorage()
    storage.setItem(DESTINATION_OPTIONS_CACHE_KEY, JSON.stringify(apiPayload))
    const fetcher = vi.fn()
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal('fetch', fetcher)

    const result = await loadDestinationOptions()

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.source).toBe('cache')
    expect(result.countries[0]?.code).toBe('DE')
    expect(result.notice).toContain('Keine Internetverbindung')
  })

  it('uses bundled data offline without a cache or network request', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('localStorage', new MemoryStorage())
    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal('fetch', fetcher)

    const result = await loadDestinationOptions()

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.source).toBe('bundle')
    expect(result.countries.length).toBeGreaterThan(0)
    expect(result.countries.some((country) => country.code === 'DE')).toBe(true)
    expect(result.notice).toContain('Mitgelieferte Länderoptionen')
  })

  it('refreshes and saves the local cache when online', async () => {
    const storage = new MemoryStorage()
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => apiPayload,
      })),
    )

    const result = await loadDestinationOptions()

    expect(result.source).toBe('network')
    expect(result.notice).toBeNull()
    expect(storage.getItem(DESTINATION_OPTIONS_CACHE_KEY)).toBe(
      JSON.stringify(apiPayload),
    )
  })

  it('uses saved data when an online refresh fails', async () => {
    const storage = new MemoryStorage()
    storage.setItem(DESTINATION_OPTIONS_CACHE_KEY, JSON.stringify(apiPayload))
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Network unavailable')
      }),
    )

    const result = await loadDestinationOptions()

    expect(result.source).toBe('cache')
    expect(result.countries[0]?.code).toBe('DE')
    expect(result.notice).toContain('Network unavailable')
  })

  it('uses bundled data when online refresh fails before the first cache is saved', async () => {
    vi.stubGlobal('localStorage', new MemoryStorage())
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Network unavailable')
      }),
    )

    const result = await loadDestinationOptions()

    expect(result.source).toBe('bundle')
    expect(result.countries.some((country) => country.code === 'DE')).toBe(true)
    expect(result.notice).toContain('Network unavailable')
  })
})
