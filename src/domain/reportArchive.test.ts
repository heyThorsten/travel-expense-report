import { describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  createReportArchive,
  openReportArchive,
  REPORT_ARCHIVE_EXTENSION,
} from './reportArchive'
import { createEmptyReport } from './report'

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

describe('report archive', () => {
  it('round-trips report data and receipt files', async () => {
    const report = createEmptyReport()
    report.personalDetails = {
      lastName: 'Beispiel',
      firstName: 'Max',
      personnelNumber: '1234',
      department: 'IT',
    }
    report.trip.purpose = 'Dienstreise'
    report.itineraryStops[0]!.destination = 'Berlin'
    report.itineraryStops[0]!.startAt = '2026-10-17T09:00'
    report.itineraryStops[0]!.endAt = '2026-10-17T17:00'
    report.mealSelectionsByDate['2026-10-17'] = {
      breakfast: false,
      lunch: true,
      dinner: false,
    }
    report.excludedMealAllowanceDates = ['2026-10-18']
    const pngBytes = decodeBase64(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
    )
    report.expenses = [
      {
        id: 'expense-1',
        category: 'transport',
        mode: 'actual',
        date: '2026-10-17',
        description: 'Bahnfahrt',
        amountMinor: 1234,
        receipt: {
          file: new File([toArrayBuffer(pngBytes)], 'Fahrkarte.png', {
            type: 'image/png',
          }),
          mediaType: 'image/png',
        },
      },
      {
        id: 'expense-2',
        category: 'transport',
        mode: 'private-car-mileage',
        date: '2026-10-18',
        description: '',
        mileage: { kilometers: 12, ratePerKilometerMinor: 30 },
        receipt: null,
      },
    ]

    const bytes = await createReportArchive(report)
    const archiveFile = new File(
      [toArrayBuffer(bytes)],
      `Reisekostenabrechnung${REPORT_ARCHIVE_EXTENSION}`,
      { type: 'application/zip' },
    )
    const restored = await openReportArchive(archiveFile)

    expect(restored.personalDetails).toEqual(report.personalDetails)
    expect(restored.trip).toEqual(report.trip)
    expect(restored.itineraryStops).toEqual(report.itineraryStops)
    expect(restored.mealSelectionsByDate).toEqual(report.mealSelectionsByDate)
    expect(restored.excludedMealAllowanceDates).toEqual(
      report.excludedMealAllowanceDates,
    )
    expect(restored.expenses[0]).toMatchObject({
      id: 'expense-1',
      category: 'transport',
      mode: 'actual',
      amountMinor: 1234,
      receipt: {
        mediaType: 'image/png',
        file: { name: 'Fahrkarte.png' },
      },
    })
    expect(
      [...new Uint8Array(await restored.expenses[0]!.receipt!.file.arrayBuffer())],
    ).toEqual([...pngBytes])
    expect(restored.expenses[1]).toEqual(report.expenses[1])
  })

  it('rejects damaged zip files without returning partial report data', async () => {
    const damagedArchive = new File(
      [Uint8Array.from([1, 2, 3, 4])],
      `broken${REPORT_ARCHIVE_EXTENSION}`,
      { type: 'application/zip' },
    )

    await expect(openReportArchive(damagedArchive)).rejects.toThrow(
      'Die ZIP-Datei ist beschädigt oder wird nicht unterstützt.',
    )
  })

  it('opens older archives without excluded meal allowance dates', async () => {
    const bytes = await createReportArchive(createEmptyReport())
    const entries = unzipSync(bytes)
    const manifest = JSON.parse(strFromU8(entries['report.json']!))
    delete manifest.report.excludedMealAllowanceDates
    const legacyBytes = zipSync(
      { 'report.json': strToU8(JSON.stringify(manifest)) },
      { level: 0 },
    )
    const archiveFile = new File(
      [toArrayBuffer(legacyBytes)],
      `legacy${REPORT_ARCHIVE_EXTENSION}`,
      { type: 'application/zip' },
    )

    const restored = await openReportArchive(archiveFile)

    expect(restored.excludedMealAllowanceDates).toEqual([])
  })

  it('rejects archives with a different file extension', async () => {
    const bytes = await createReportArchive(createEmptyReport())
    const wrongExtension = new File(
      [toArrayBuffer(bytes)],
      'Reisekostenabrechnung.zip',
      { type: 'application/zip' },
    )

    await expect(openReportArchive(wrongExtension)).rejects.toThrow(
      `Dateiendung ${REPORT_ARCHIVE_EXTENSION}`,
    )
  })
})
