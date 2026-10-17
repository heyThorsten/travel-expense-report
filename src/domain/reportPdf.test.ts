import { describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createEmptyReport } from './report'
import { createTravelReportPdf } from './reportPdf'
import { ReportPdfWriter } from './reportPdfWriter'
import { groupExpenses } from './expenseCalculations'
import { formatEuroCurrency } from './currency'

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

describe('createTravelReportPdf', () => {
  it('uses the same category totals as the UI for exact cents and overflow', async () => {
    for (const amounts of [[4990, 360], [Number.MAX_SAFE_INTEGER, 1], [null, 100]]) {
      const report = createEmptyReport()
      report.expenses = amounts.map((amountMinor, index) => ({
        id: `expense-${index}`,
        category: 'transport',
        mode: 'actual',
        date: '2026-10-17',
        description: '',
        amountMinor,
        receipt: null,
      }))
      const categoryTotal = groupExpenses(report.expenses)[0]!.totalMinor
      const sections = vi.spyOn(ReportPdfWriter.prototype, 'addGridSection')
      try {
        await createTravelReportPdf(report, [], [])
        const overview = sections.mock.calls.find(([title]) => title === 'Kostenübersicht')?.[1]
        const expected = categoryTotal === null ? 'nicht berechenbar' : formatEuroCurrency(categoryTotal)
        expect(overview?.find((cell) => cell.label === 'Fahrtkosten')?.value).toBe(expected)
        expect(overview?.find((cell) => cell.label === 'Gesamtkosten')?.value).toBe(expected)
      } finally {
        sections.mockRestore()
      }
    }
  })

  it('fits every receipt onto one referenced page', async () => {
    const sourceReceipt = await PDFDocument.create()
    sourceReceipt.addPage()
    sourceReceipt.addPage()
    const sourceReceiptBytes = await sourceReceipt.save()
    const pdfReceipt = new File(
      [toArrayBuffer(sourceReceiptBytes)],
      'Bahnfahrkarte.pdf',
      { type: 'application/pdf' },
    )
    const pngReceipt = new File(
      [
        decodeBase64(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
        ),
      ],
      'Hotelbeleg.png',
      { type: 'image/png' },
    )
    const report = createEmptyReport()
    report.expenses = [
      {
        id: 'expense-1',
        category: 'transport',
        mode: 'actual',
        date: '2026-10-17',
        description: 'Bahnfahrt',
        amountMinor: 1234,
        receipt: { file: pdfReceipt, mediaType: 'application/pdf' },
      },
      {
        id: 'expense-2',
        category: 'accommodation',
        mode: 'actual',
        date: '2026-10-18',
        description: 'Hotel',
        amountMinor: 2500,
        receipt: { file: pngReceipt, mediaType: 'image/png' },
      },
    ]

    const result = await createTravelReportPdf(report, [], [])
    const generatedPdf = await PDFDocument.load(result)

    expect(generatedPdf.getTitle()).toBe('Reisekostenabrechnung')
    expect(generatedPdf.getPageCount()).toBe(4)
  })

  it('creates a report PDF without expenses or receipts', async () => {
    const result = await createTravelReportPdf(createEmptyReport(), [], [])
    const generatedPdf = await PDFDocument.load(result)

    expect(generatedPdf.getTitle()).toBe('Reisekostenabrechnung')
    expect(generatedPdf.getPageCount()).toBe(1)
  })

  it('adds meal allowance details as a separate attachment page', async () => {
    const report = createEmptyReport()
    report.expenses = [
      {
        id: 'expense-1',
        category: 'transport',
        mode: 'actual',
        date: '2026-10-17',
        description: 'Bahnfahrt',
        amountMinor: 1234,
        receipt: null,
      },
    ]

    const result = await createTravelReportPdf(
      report,
      [
        {
          date: '2026-10-17',
          kind: 'short',
          countryCode: 'DE',
          countryName: 'Deutschland',
          region: '',
          baseAmountMinor: 1400,
          deductionMinor: 0,
          payableAmountMinor: 1400,
        },
      ],
      [],
    )
    const generatedPdf = await PDFDocument.load(result)

    expect(generatedPdf.getPageCount()).toBe(3)
  })

  it('does not append a receipt for private-car mileage', async () => {
    const report = createEmptyReport()
    const pngReceipt = new File(
      [
        decodeBase64(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
        ),
      ],
      'private-car.png',
      { type: 'image/png' },
    )
    report.expenses = [
      {
        id: 'expense-1',
        category: 'transport',
        mode: 'private-car-mileage',
        date: '2026-10-17',
        description: '',
        mileage: { kilometers: 10, ratePerKilometerMinor: 30 },
        receipt: { file: pngReceipt, mediaType: 'image/png' },
      },
    ]

    const result = await createTravelReportPdf(report, [], [])
    const generatedPdf = await PDFDocument.load(result)

    expect(generatedPdf.getPageCount()).toBe(2)
  })
})
