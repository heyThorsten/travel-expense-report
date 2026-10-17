import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
} from 'pdf-lib'
import { formatEuroCurrency } from './currency'
import { formatGermanDateWithWeekday } from './dateFormatting'
import type { DestinationCountryOption } from './destinationOptions'
import type { MealAllowanceDay } from './mealAllowance'
import type {
  ExpenseCategory,
  ExpenseDraft,
  ReportDraft,
} from './report'
import {
  EXPENSE_CATEGORY_ORDER,
  expenseAmountMinor,
  groupExpenses,
  sumAmounts,
  transportModeLabel,
} from './expenseCalculations'
import {
  ReportPdfWriter,
  PAGE_WIDTH,
  MARGIN,
  BOTTOM_MARGIN,
  type TableColumn,
} from './reportPdfWriter'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: 'Fahrtkosten',
  accommodation: 'Übernachtungskosten',
  other: 'Reisenebenkosten',
}

interface ReceiptReference {
  expense: ExpenseDraft
  expenseReference: string
  receiptReference: string
}

export async function createTravelReportPdf(
  report: ReportDraft,
  mealAllowanceDays: MealAllowanceDay[],
  countries: DestinationCountryOption[],
): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.setTitle('Reisekostenabrechnung')
  document.setSubject('Reisekostenabrechnung mit Belegen')
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const writer = new ReportPdfWriter(document, regular, bold)
  const sortedExpenses = sortExpenses(report.expenses)
  const { expenseReferences, receipts } = assignReferences(sortedExpenses)

  writeReportBody(
    writer,
    report,
    mealAllowanceDays,
    countries,
    sortedExpenses,
  )
  writeExpenseAttachment(writer, sortedExpenses, expenseReferences, receipts)
  writeMealAllowanceAttachment(writer, report, mealAllowanceDays)
  await appendReceipts(document, writer, receipts)

  return document.save()
}

function writeReportBody(
  writer: ReportPdfWriter,
  report: ReportDraft,
  mealAllowanceDays: MealAllowanceDay[],
  countries: DestinationCountryOption[],
  expenses: ExpenseDraft[],
): void {
  writer.addText('Reisekostenabrechnung', {
    font: writer.bold,
    size: 18,
    spacingAfter: 1,
  })
  writer.addText(
    `Erstellt am ${new Intl.DateTimeFormat('de-DE').format(new Date())}`,
    { size: 8, color: rgb(0.35, 0.39, 0.44), spacingAfter: 14 },
  )

  writer.addGridSection('Persönliche Daten', [
    {
      label: 'Nachname',
      value: report.personalDetails.lastName || 'Nicht angegeben',
    },
    {
      label: 'Vorname',
      value: report.personalDetails.firstName || 'Nicht angegeben',
    },
    { label: 'Personalnummer', value: report.personalDetails.personnelNumber },
    { label: 'Abteilung', value: report.personalDetails.department },
  ])

  const firstStop = report.itineraryStops[0]
  const lastStop = report.itineraryStops.at(-1)
  const destinations = report.itineraryStops.map((stop) => {
    const country =
      countries.find((option) => option.code === stop.countryCode)?.name ??
      stop.countryCode
    return [stop.destination, stop.cityOrRegion, country]
      .filter(Boolean)
      .join(', ')
  })
  writer.addGridSection('Reisedaten', [
    {
      label: 'Reisebeginn',
      value: formatDateTime(firstStop?.startAt ?? ''),
    },
    {
      label: 'Reiseende',
      value: formatDateTime(lastStop?.endAt ?? ''),
    },
    {
      label: 'Reiseziel(e)',
      value: destinations.join('\n') || 'Nicht angegeben',
      fullWidth: true,
    },
    {
      label: 'Reisezweck',
      value: report.trip.purpose || 'Nicht angegeben',
      fullWidth: true,
    },
  ], 2)

  const mealAllowanceTotal = sumAmounts(
    mealAllowanceDays.map((day) => day.payableAmountMinor),
  )
  const expenseTotal = sumAmounts(expenses.map(expenseAmountMinor))
  const grandTotal =
    mealAllowanceTotal === null || expenseTotal === null
      ? null
      : sumAmounts([mealAllowanceTotal, expenseTotal])
  writer.addGridSection('Kostenübersicht', [
    ...EXPENSE_CATEGORY_ORDER.slice(0, 2).map((category) => ({
      label: CATEGORY_LABELS[category],
      value: formatOptionalCurrency(
        sumAmounts(
          expenses
            .filter((expense) => expense.category === category)
            .map(expenseAmountMinor),
        ),
      ),
    })),
    {
      label: 'Verpflegungsmehraufwand',
      value: formatOptionalCurrency(mealAllowanceTotal),
    },
    {
      label: CATEGORY_LABELS.other,
      value: formatOptionalCurrency(
        sumAmounts(
          expenses
            .filter((expense) => expense.category === 'other')
            .map(expenseAmountMinor),
        ),
      ),
    },
    {
      label: 'Gesamtkosten',
      value: formatOptionalCurrency(grandTotal),
      emphasis: true,
    },
  ], 1)
}

function writeExpenseAttachment(
  writer: ReportPdfWriter,
  expenses: ExpenseDraft[],
  expenseReferences: Map<string, string>,
  receipts: ReceiptReference[],
): void {
  if (expenses.length === 0) return

  writer.startPage()
  writer.addText('Anlage: Ausgabenübersicht', {
    font: writer.bold,
    size: 16,
    spacingAfter: 5,
  })
  writer.addText('Zusammenfassung der erfassten Ausgaben und Belegreferenzen.', {
    size: 8.5,
    color: rgb(0.35, 0.39, 0.44),
    spacingAfter: 10,
  })

  const receiptReferences = new Map(
    receipts.map(({ expense, receiptReference }) => [
      expense.id,
      receiptReference,
    ]),
  )
  for (const category of EXPENSE_CATEGORY_ORDER) {
    const categoryExpenses = expenses.filter(
      (expense) => expense.category === category,
    )
    if (categoryExpenses.length === 0) continue

    writer.addText(CATEGORY_LABELS[category], {
      font: writer.bold,
      size: 9.5,
      spacingAfter: 8,
    })
    const columns: TableColumn[] =
      category === 'transport'
        ? [
            { label: 'Referenz', width: 48 },
            { label: 'Datum', width: 64 },
            { label: 'Beschreibung', width: 150 },
            { label: 'Verkehrsmittel / km', width: 100 },
            { label: 'Betrag', width: 70 },
            { label: 'Beleg', width: 75 },
          ]
        : [
            { label: 'Referenz', width: 48 },
            { label: 'Datum', width: 68 },
            { label: 'Beschreibung', width: 195 },
            { label: 'Betrag', width: 90 },
            { label: 'Beleg', width: 106 },
          ]
    const rows = categoryExpenses.map((expense) => [
      expenseReferences.get(expense.id) ?? '-',
      formatGermanDateWithWeekday(expense.date),
      expense.description || '-',
      ...(category === 'transport'
        ? [
            expense.mode === 'private-car-mileage'
              ? `${expense.mileage.kilometers ?? '-'} km × ${formatOptionalCurrency(expense.mileage.ratePerKilometerMinor)} / km`
              : transportModeLabel(expense) ?? '-',
          ]
        : []),
      formatOptionalCurrency(expenseAmountMinor(expense)),
      receiptReferences.get(expense.id) ?? '-',
    ])
    writer.addTable(columns, rows)
    writer.addText(
      `Summe ${CATEGORY_LABELS[category]}: ${formatOptionalCurrency(sumAmounts(categoryExpenses.map(expenseAmountMinor)))}`,
      { font: writer.bold, size: 8.5, spacingAfter: 12 },
    )
  }
  writer.addText(
    `Gesamtsumme Ausgaben: ${formatOptionalCurrency(sumAmounts(expenses.map(expenseAmountMinor)))}`,
    { font: writer.bold, size: 10, spacingAfter: 0 },
  )
}

function writeMealAllowanceAttachment(
  writer: ReportPdfWriter,
  report: ReportDraft,
  mealAllowanceDays: MealAllowanceDay[],
): void {
  if (mealAllowanceDays.length === 0) return

  writer.startPage()
  writer.addText('Anlage: Verpflegungsmehraufwand', {
    font: writer.bold,
    size: 16,
    spacingAfter: 7,
  })
  writer.addText(
    'Tagesübersicht der Pauschalen, Mahlzeitenabzüge und Erstattungsbeträge.',
    {
      size: 8.5,
      color: rgb(0.35, 0.39, 0.44),
      spacingAfter: 10,
    },
  )
  const columns: TableColumn[] = [
    { label: 'Datum', width: 64 },
    { label: 'Land / Region', width: 90 },
    { label: 'Pauschale', width: 65 },
    { label: 'Gestellte Mahlzeiten', width: 99 },
    { label: 'Grundbetrag', width: 62 },
    { label: 'Abzug', width: 55 },
    { label: 'Erstattung', width: 72 },
  ]
  const rows = mealAllowanceDays.map((day) => {
    const selections = report.mealSelectionsByDate[day.date]
    const providedMeals = [
      selections?.breakfast ? 'Frühstück' : '',
      selections?.lunch ? 'Mittagessen' : '',
      selections?.dinner ? 'Abendessen' : '',
    ].filter(Boolean)
    const location = [day.countryName, day.region].filter(Boolean).join(', ')
    return [
      formatGermanDateWithWeekday(day.date),
      location || '-',
      day.kind === 'full' ? '24 Stunden' : 'Kürzerer Tag',
      providedMeals.join(', ') || 'Keine',
      day.baseAmountMinor === null
        ? 'Nicht verfügbar'
        : formatEuroCurrency(day.baseAmountMinor),
      formatEuroCurrency(day.deductionMinor),
      day.payableAmountMinor === null
        ? 'Nicht verfügbar'
        : formatEuroCurrency(day.payableAmountMinor),
    ]
  })
  writer.addTable(columns, rows, 7.2)

  const total = sumAmounts(
    mealAllowanceDays.map((day) => day.payableAmountMinor),
  )
  writer.addText(
    `Summe Verpflegungsmehraufwand (${mealAllowanceDays.length} Tage): ${formatOptionalCurrency(total)}`,
    { font: writer.bold, size: 10, spacingAfter: 0 },
  )
}

async function appendReceipts(
  document: PDFDocument,
  writer: ReportPdfWriter,
  references: ReceiptReference[],
): Promise<void> {
  for (const reference of references) {
    const { expense, receiptReference } = reference
    const attachment = expense.receipt
    if (!attachment) continue

    if (attachment.mediaType === 'application/pdf') {
      const page = writer.startPage()
      writeReceiptHeading(writer, reference)
      const source = await PDFDocument.load(await attachment.file.arrayBuffer())
      const sourcePages = source.getPages()
      // pdf-lib needs a content stream to embed otherwise valid blank pages.
      sourcePages.forEach((sourcePage) => {
        sourcePage.drawRectangle({
          x: 0,
          y: 0,
          width: 0.01,
          height: 0.01,
          color: rgb(1, 1, 1),
          opacity: 0,
        })
      })
      const embeddedPages = await document.embedPdf(await source.save())
      if (embeddedPages.length === 0) {
        throw new Error(`Der Beleg ${receiptReference} enthält keine PDF-Seiten.`)
      }
      drawPdfReceiptPages(page, embeddedPages, writer.y)
      continue
    }

    const page = writer.startPage()
    writeReceiptHeading(writer, reference)
    const bytes = await attachment.file.arrayBuffer()
    const image =
      attachment.mediaType === 'image/jpeg'
        ? await document.embedJpg(bytes)
        : await document.embedPng(bytes)
    const availableWidth = PAGE_WIDTH - MARGIN * 2
    const availableHeight = writer.y - BOTTOM_MARGIN
    const scale = Math.min(
      availableWidth / image.width,
      availableHeight / image.height,
    )
    const width = image.width * scale
    const height = image.height * scale
    page.drawImage(image, {
      x: (PAGE_WIDTH - width) / 2,
      y: BOTTOM_MARGIN + (availableHeight - height) / 2,
      width,
      height,
    })
  }
}

function drawPdfReceiptPages(
  page: PDFPage,
  embeddedPages: Awaited<ReturnType<PDFDocument['embedPdf']>>,
  top: number,
): void {
  const contentWidth = PAGE_WIDTH - MARGIN * 2
  const availableHeight = top - BOTTOM_MARGIN
  const columns = embeddedPages.length === 1 ? 1 : 2
  const rows = Math.ceil(embeddedPages.length / columns)
  const gap = 10
  const cellWidth = (contentWidth - gap * (columns - 1)) / columns
  const cellHeight = (availableHeight - gap * (rows - 1)) / rows

  embeddedPages.forEach((embeddedPage, index) => {
    const scale = Math.min(
      cellWidth / embeddedPage.width,
      cellHeight / embeddedPage.height,
    )
    const width = embeddedPage.width * scale
    const height = embeddedPage.height * scale
    const column = index % columns
    const row = Math.floor(index / columns)
    const cellX = MARGIN + column * (cellWidth + gap)
    const cellTop = top - row * (cellHeight + gap)
    const x = cellX + (cellWidth - width) / 2
    const y = cellTop - cellHeight + (cellHeight - height) / 2

    page.drawRectangle({
      x: cellX,
      y: cellTop - cellHeight,
      width: cellWidth,
      height: cellHeight,
      borderColor: rgb(0.78, 0.81, 0.84),
      borderWidth: 0.4,
    })
    page.drawPage(embeddedPage, { x, y, width, height })
  })
}

function writeReceiptHeading(
  writer: ReportPdfWriter,
  reference: ReceiptReference,
): void {
  const { expense, expenseReference, receiptReference } = reference
  writer.addText(`Beleg ${receiptReference} - zu ${expenseReference}`, {
    font: writer.bold,
    size: 16,
    spacingAfter: 6,
  })
  writer.addText(`Kategorie: ${CATEGORY_LABELS[expense.category]}`, {
    size: 9,
    spacingAfter: 1,
  })
  writer.addText(`Beschreibung: ${expense.description || '-'}`, {
    size: 9,
    spacingAfter: 1,
  })
  writer.addText(`Betrag: ${formatOptionalCurrency(expenseAmountMinor(expense))}`, {
    size: 9,
    spacingAfter: 10,
  })
}

function sortExpenses(expenses: ExpenseDraft[]): ExpenseDraft[] {
  return groupExpenses(expenses).flatMap(group => group.expenses)
}

function assignReferences(expenses: ExpenseDraft[]): {
  expenseReferences: Map<string, string>
  receipts: ReceiptReference[]
} {
  const expenseReferences = new Map<string, string>()
  const receipts: ReceiptReference[] = []
  const categoryIndices = new Map<ExpenseCategory, number>()

  expenses.forEach((expense) => {
    const index = (categoryIndices.get(expense.category) ?? 0) + 1
    categoryIndices.set(expense.category, index)
    const suffix = expenseReferenceSuffix(expense.category)
    const expenseReference = `${suffix}-${String(index).padStart(2, '0')}`
    expenseReferences.set(expense.id, expenseReference)
    if (expense.receipt && expense.mode !== 'private-car-mileage') {
      receipts.push({
        expense,
        expenseReference,
        receiptReference: `B-${String(receipts.length + 1).padStart(2, '0')}`,
      })
    }
  })

  return { expenseReferences, receipts }
}

function expenseReferenceSuffix(category: ExpenseCategory): string {
  if (category === 'transport') return 'F'
  if (category === 'accommodation') return 'Ü'
  return 'R'
}

function formatOptionalCurrency(amount: number | null): string {
  return amount === null ? 'nicht berechenbar' : formatEuroCurrency(amount)
}

function formatDateTime(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value)
  return match
    ? `${formatGermanDateWithWeekday(match[1]!)} ${match[2]}`
    : 'Nicht angegeben'
}

