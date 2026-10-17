import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  MAX_RECEIPT_SIZE_BYTES,
  validateReceiptFile,
} from './receipts'
import type {
  ActualExpenseDraft,
  ExpenseCategory,
  ExpenseDraft,
  MealSelections,
  MileageExpenseDraft,
  ReceiptMediaType,
  ReportDraft,
} from './report'

const ARCHIVE_FORMAT = 'travel-expense-report'
const ARCHIVE_VERSION = 1
const MANIFEST_PATH = 'report.json'
const MAX_MANIFEST_SIZE_BYTES = 10 * 1024 * 1024
const RECEIPT_PATH_PATTERN = /^receipts\/receipt-\d{4,}\.(pdf|jpg|png)$/
export const REPORT_ARCHIVE_EXTENSION = '.reisekosten'

interface ArchivedReceipt {
  path: string
  fileName: string
  mediaType: ReceiptMediaType
}

type ArchivedExpense =
  | (Omit<ActualExpenseDraft, 'receipt'> & {
      receipt: ArchivedReceipt | null
    })
  | (Omit<MileageExpenseDraft, 'receipt'> & {
      receipt: ArchivedReceipt | null
    })

interface ArchivedReport extends Omit<ReportDraft, 'expenses'> {
  expenses: ArchivedExpense[]
}

interface ReportArchiveManifest {
  format: typeof ARCHIVE_FORMAT
  version: typeof ARCHIVE_VERSION
  report: ArchivedReport
}

export async function createReportArchive(
  report: ReportDraft,
): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {}
  const expenses: ArchivedExpense[] = []
  let receiptIndex = 0

  for (const expense of report.expenses) {
    const { receipt, ...expenseData } = expense
    let archivedReceipt: ArchivedReceipt | null = null

    if (receipt) {
      const extension = extensionForMediaType(receipt.mediaType)
      const path = `receipts/receipt-${String(++receiptIndex).padStart(4, '0')}.${extension}`
      files[path] = new Uint8Array(await receipt.file.arrayBuffer())
      archivedReceipt = {
        path,
        fileName: receipt.file.name,
        mediaType: receipt.mediaType,
      }
    }

    expenses.push({ ...expenseData, receipt: archivedReceipt })
  }

  const manifest: ReportArchiveManifest = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    report: { ...report, expenses },
  }
  files[MANIFEST_PATH] = strToU8(JSON.stringify(manifest))

  return zipSync(files, { level: 0 })
}

export async function openReportArchive(file: File): Promise<ReportDraft> {
  if (!file.name.toLowerCase().endsWith(REPORT_ARCHIVE_EXTENSION)) {
    fail(`Nur Berichte mit der Dateiendung ${REPORT_ARCHIVE_EXTENSION} können geöffnet werden.`)
  }

  let archive: ReturnType<typeof unzipSync>
  const seenPaths = new Set<string>()

  try {
    archive = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: ({ name, size, originalSize, compression }) => {
        if (seenPaths.has(name)) {
          fail(`Der ZIP-Eintrag "${name}" ist mehrfach vorhanden.`)
        }
        seenPaths.add(name)

        if (compression !== 0 || size !== originalSize) {
          fail('Das Berichtsarchiv muss im unterstützten ZIP-Format vorliegen.')
        }
        if (name === MANIFEST_PATH) {
          if (originalSize > MAX_MANIFEST_SIZE_BYTES) {
            fail('Die Berichtsdaten in der ZIP-Datei sind zu groß.')
          }
          return true
        }

        if (!RECEIPT_PATH_PATTERN.test(name)) {
          fail(`Der ZIP-Eintrag "${name}" wird nicht unterstützt.`)
        }
        if (originalSize > MAX_RECEIPT_SIZE_BYTES) {
          fail(`Der Beleg "${name}" überschreitet die zulässige Größe von 10 MiB.`)
        }
        return true
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Berichtsarchiv:')) {
      throw error
    }
    throw new Error(
      'Berichtsarchiv: Die ZIP-Datei ist beschädigt oder wird nicht unterstützt.',
      { cause: error },
    )
  }

  const manifestBytes = archive[MANIFEST_PATH]
  if (!manifestBytes) fail('Die Datei report.json fehlt.')

  let manifestValue: unknown
  try {
    manifestValue = JSON.parse(strFromU8(manifestBytes))
  } catch (error) {
    throw new Error(
      'Berichtsarchiv: Die Datei report.json enthält ungültige Daten.',
      { cause: error },
    )
  }

  assertRecord(manifestValue, 'Berichtsmanifest')
  if (
    manifestValue.format !== ARCHIVE_FORMAT ||
    manifestValue.version !== ARCHIVE_VERSION
  ) {
    fail('Das ZIP-Format oder die Archivversion wird nicht unterstützt.')
  }
  const archivedReport = readReport(manifestValue.report)
  const referencedPaths = new Set<string>([MANIFEST_PATH])
  const expenses: ExpenseDraft[] = []

  for (const expense of archivedReport.expenses) {
    const receipt = await restoreReceipt(
      expense.receipt,
      archive,
      referencedPaths,
    )
    if (expense.mode === 'actual') {
      expenses.push({ ...expense, receipt })
    } else {
      expenses.push({ ...expense, receipt })
    }
  }

  if (Object.keys(archive).some((path) => !referencedPaths.has(path))) {
    fail('Die ZIP-Datei enthält nicht zugeordnete Dateien.')
  }

  return { ...archivedReport, expenses }
}

function readReport(value: unknown): ArchivedReport {
  assertRecord(value, 'Reisedaten')
  assertRecord(value.personalDetails, 'Persönliche Daten')
  assertRecord(value.trip, 'Reisedaten')
  assertRecord(value.mealSelectionsByDate, 'Mahlzeitenauswahl')

  const itineraryStops = readArray(value.itineraryStops, 'Reiseziele').map(
    (stop, index) => {
      assertRecord(stop, `Reiseziel ${index + 1}`)
      return {
        id: readString(stop.id, `Reiseziel ${index + 1}: ID`),
        destination: readString(stop.destination, `Reiseziel ${index + 1}: Ort`),
        countryCode: readString(stop.countryCode, `Reiseziel ${index + 1}: Land`),
        cityOrRegion: readString(
          stop.cityOrRegion,
          `Reiseziel ${index + 1}: Region`,
        ),
        startAt: readString(stop.startAt, `Reiseziel ${index + 1}: Beginn`),
        endAt: readString(stop.endAt, `Reiseziel ${index + 1}: Ende`),
      }
    },
  )
  requireUniqueValues(
    itineraryStops.map((stop) => stop.id),
    'Die Reiseziele enthalten doppelte IDs.',
  )

  const mealSelectionEntries: Array<[string, MealSelections]> = []
  for (const [date, selection] of Object.entries(value.mealSelectionsByDate)) {
    assertRecord(selection, `Mahlzeitenauswahl für ${date}`)
    if (
      typeof selection.breakfast !== 'boolean' ||
      typeof selection.lunch !== 'boolean' ||
      typeof selection.dinner !== 'boolean'
    ) {
      fail(`Die Mahlzeitenauswahl für ${date} ist ungültig.`)
    }
    mealSelectionEntries.push([
      date,
      {
        breakfast: selection.breakfast,
        lunch: selection.lunch,
        dinner: selection.dinner,
      },
    ])
  }
  const mealSelectionsByDate = Object.fromEntries(mealSelectionEntries)

  const excludedMealAllowanceDates =
    value.excludedMealAllowanceDates === undefined
      ? []
      : readArray(
          value.excludedMealAllowanceDates,
          'Ausgeschlossene Verpflegungstage',
        ).map((date, index) =>
          readString(date, `Ausgeschlossener Verpflegungstag ${index + 1}`),
        )
  requireUniqueValues(
    excludedMealAllowanceDates,
    'Die ausgeschlossenen Verpflegungstage enthalten doppelte oder leere Daten.',
  )

  const expenses = readArray(value.expenses, 'Ausgaben').map(readExpense)
  requireUniqueValues(
    expenses.map((expense) => expense.id),
    'Die Ausgaben enthalten doppelte IDs.',
  )

  return {
    personalDetails: {
      lastName: readString(value.personalDetails.lastName, 'Nachname'),
      firstName: readString(value.personalDetails.firstName, 'Vorname'),
      personnelNumber: readString(
        value.personalDetails.personnelNumber,
        'Personalnummer',
      ),
      department: readString(value.personalDetails.department, 'Abteilung'),
    },
    trip: {
      purpose: readString(value.trip.purpose, 'Reisezweck'),
    },
    itineraryStops,
    mealSelectionsByDate,
    excludedMealAllowanceDates,
    expenses,
    advanceMinor: readNullableInteger(value.advanceMinor, 'Vorschuss'),
    reimbursedMinor: readNullableInteger(
      value.reimbursedMinor,
      'Erstatteter Betrag',
    ),
  }
}

function readExpense(value: unknown): ArchivedExpense {
  assertRecord(value, 'Ausgabe')
  const id = readString(value.id, 'Ausgabe: ID')
  const category = readCategory(value.category)
  const date = readString(value.date, 'Ausgabe: Datum')
  const description = readString(value.description, 'Ausgabe: Beschreibung')
  const receipt = readArchivedReceipt(value.receipt)

  if (value.mode === 'actual') {
    return {
      id,
      category,
      mode: 'actual',
      date,
      description,
      amountMinor: readNullableInteger(value.amountMinor, 'Ausgabenbetrag'),
      receipt,
    }
  }

  if (value.mode === 'private-car-mileage' && category === 'transport') {
    assertRecord(value.mileage, 'Kilometerpauschale')
    const kilometers = readNullableInteger(value.mileage.kilometers, 'Kilometer')
    const ratePerKilometerMinor = readNullableInteger(
      value.mileage.ratePerKilometerMinor,
      'Kilometersatz',
    )
    if (kilometers !== null && kilometers < 0) {
      fail('Die Kilometerangabe darf nicht negativ sein.')
    }
    if (ratePerKilometerMinor !== null && ratePerKilometerMinor < 0) {
      fail('Der Kilometersatz darf nicht negativ sein.')
    }
    return {
      id,
      category: 'transport',
      mode: 'private-car-mileage',
      date,
      description,
      mileage: {
        kilometers,
        ratePerKilometerMinor,
      },
      receipt,
    }
  }

  fail(`Die Ausgabe "${id}" hat eine ungültige Erfassungsart.`)
}

function readArchivedReceipt(value: unknown): ArchivedReceipt | null {
  if (value === null) return null
  assertRecord(value, 'Beleg')
  const path = readString(value.path, 'Belegpfad')
  if (!RECEIPT_PATH_PATTERN.test(path)) {
    fail('Ein Beleg verweist auf einen ungültigen ZIP-Pfad.')
  }
  const fileName = readString(value.fileName, 'Belegdateiname')
  if (
    fileName.length > 255 ||
    /[/\\\u0000-\u001f\u007f]/.test(fileName) ||
    fileName.trim() === ''
  ) {
    fail('Ein Beleg enthält einen ungültigen Dateinamen.')
  }
  if (
    value.mediaType !== 'application/pdf' &&
    value.mediaType !== 'image/jpeg' &&
    value.mediaType !== 'image/png'
  ) {
    fail(`Der Beleg "${fileName}" hat einen nicht unterstützten Dateityp.`)
  }

  return {
    path,
    fileName,
    mediaType: value.mediaType,
  }
}

async function restoreReceipt(
  receipt: ArchivedReceipt | null,
  archive: ReturnType<typeof unzipSync>,
  referencedPaths: Set<string>,
) {
  if (!receipt) return null
  if (referencedPaths.has(receipt.path)) {
    fail(`Der Belegpfad "${receipt.path}" wird mehrfach verwendet.`)
  }
  const bytes = archive[receipt.path]
  if (!bytes) fail(`Der Beleg "${receipt.fileName}" fehlt in der ZIP-Datei.`)

  const file = new File([bytes], receipt.fileName, { type: receipt.mediaType })
  const validation = await validateReceiptFile(file)
  if (!validation.valid || validation.attachment.mediaType !== receipt.mediaType) {
    fail(`Der Beleg "${receipt.fileName}" ist ungültig: ${validation.valid ? 'Dateityp stimmt nicht überein.' : validation.error}`)
  }
  referencedPaths.add(receipt.path)
  return validation.attachment
}

function extensionForMediaType(mediaType: ReceiptMediaType): string {
  if (mediaType === 'application/pdf') return 'pdf'
  if (mediaType === 'image/jpeg') return 'jpg'
  return 'png'
}

function readCategory(value: unknown): ExpenseCategory {
  if (value === 'transport' || value === 'accommodation' || value === 'other') {
    return value
  }
  fail('Eine Ausgabe enthält eine ungültige Kategorie.')
}

function readNullableInteger(value: unknown, label: string): number | null {
  if (value === null) return null
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  fail(`${label} muss eine ganze Zahl sein.`)
}

function readString(value: unknown, label: string): string {
  if (typeof value === 'string') return value
  fail(`${label} muss Text sein.`)
}

function readArray(value: unknown, label: string): unknown[] {
  if (Array.isArray(value)) return value
  fail(`${label} müssen als Liste gespeichert sein.`)
}

function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return
  }
  fail(`${label} sind ungültig.`)
}

function requireUniqueValues(values: string[], error: string): void {
  if (new Set(values).size !== values.length || values.some((value) => !value)) {
    fail(error)
  }
}

function fail(message: string): never {
  throw new Error(`Berichtsarchiv: ${message}`)
}
