import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { test, expect, type Page, type Download } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { createEmptyReport } from '../src/domain/report.ts'

const rates = readFileSync(new URL('../src/domain/destinationOptionsSnapshot.json', import.meta.url), 'utf8')

test.use({ timezoneId: 'Europe/Berlin' })
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-17T12:00:00Z'))
  await page.route('https://cdn.jsdelivr.net/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: rates }),
  )
})

async function chooseDate(page: Page, label: string) {
  await page.getByLabel(label, { exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  const picker = page.locator('.v-date-picker:visible')
  await picker.getByRole('button', { name: /17\. Oktober 2026/ }).focus()
  await page.keyboard.press('Enter')
  await expect(picker).toBeHidden()
}

async function chooseTime(page: Page, label: string, hour: string) {
  await page.getByLabel(label, { exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  const picker = page.locator('.v-time-picker:visible')
  await picker.getByRole('textbox', { name: 'Stunde', exact: true }).fill(hour)
  await picker.getByRole('textbox', { name: 'Minuten', exact: true }).fill('00')
  await page.keyboard.press('Tab')
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(picker).toBeHidden()
  await expect(page.getByLabel(label, { exact: true })).toHaveValue(`${hour}:00`)
}

async function fillReport(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Bericht als PDF herunterladen', exact: true }).click()
  await expect(page.getByText('Bitte den Nachnamen eingeben.', { exact: true })).toBeVisible()
  await page.getByLabel('Nachname', { exact: true }).fill('Test')
  await page.getByLabel('Vorname', { exact: true }).fill('Person')
  await page.getByLabel('Reisezweck', { exact: true }).fill('Synthetischer Test')
  await page.getByLabel('Ort oder Reiseziel', { exact: true }).fill('Berlin')
  await chooseDate(page, 'Startdatum')
  await chooseTime(page, 'Startzeit', '08')
  await chooseDate(page, 'Endedatum')
  await chooseTime(page, 'Endezeit', '18')
  await expect(page.getByRole('heading', { name: 'Verpflegungsmehraufwand', exact: true })).toBeVisible()
}

async function download(page: Page, button: string) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: button, exact: true }).click()
  const result = await pending
  expect(await result.failure()).toBeNull()
  return result
}

async function downloadBytes(download: Download) {
  const path = await download.path()
  if (!path) throw new Error('Download did not produce a local file.')
  return readFile(path)
}

async function receipt(text: string) {
  const document = await PDFDocument.create()
  document.addPage().drawText(text)
  return Buffer.from(await document.save())
}

test('keyboard time apply/cancel and itinerary continuation preserve values', async ({ page }) => {
  await fillReport(page)
  await page.getByLabel('Startzeit', { exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  await page.getByRole('textbox', { name: 'Stunde', exact: true }).fill('09')
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Startzeit', { exact: true })).toHaveValue('08:00')
  await page.getByRole('button', { name: '+ Reiseziel hinzufügen', exact: true }).click()
  const continuation = page.getByLabel('Start (automatisch übernommen)zeit', { exact: true })
  await expect(continuation).toBeDisabled()
  await expect(continuation).toHaveValue('18:00')
  await page.getByRole('button', { name: 'Entfernen', exact: true }).click()
  const backup = await download(page, 'Bericht als ZIP speichern')
  const archive = unzipSync(await downloadBytes(backup))
  const manifest = JSON.parse(strFromU8(archive['report.json']!))
  expect(manifest.report.itineraryStops[0]).toMatchObject({
    startAt: '2026-10-17T08:00',
    endAt: '2026-10-17T18:00',
  })
})

test('does not overflow narrow viewports', async ({ page }) => {
  await page.goto('./')
  for (const width of [320, 375, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width)
  }
})

test('receipt edits, safe category totals, PDF and archive round trips work together', async ({ page }) => {
  const errors: string[] = []
  const failedAssets: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.url().includes('/travel-expense-report/assets/') && response.status() >= 400) {
      failedAssets.push(response.url())
    }
  })
  await fillReport(page)
  await page.getByRole('checkbox', { name: 'Frühstück', exact: true }).check()
  await page.getByRole('button', { name: '+ Ausgabe hinzufügen', exact: true }).click()
  await chooseDate(page, 'Datum')
  await page.getByLabel('Betrag', { exact: true }).fill('49,90')
  await page.getByLabel('Beschreibung (optional)', { exact: true }).fill('Testfahrkarte')
  const input = page.locator('input.receipt-input')
  await input.setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') })
  await expect(page.getByText('Nur PDF-, JPG-, JPEG- und PNG-Belege werden unterstützt.', { exact: true })).toBeVisible()
  await input.setInputFiles({ name: 'first.pdf', mimeType: 'application/pdf', buffer: await receipt('First test receipt') })
  await expect(page.getByText('first.pdf', { exact: false })).toBeVisible()
  const replacement = await receipt('Replacement test receipt')
  await input.setInputFiles({ name: 'replacement.pdf', mimeType: 'application/pdf', buffer: replacement })
  await expect(page.getByText('replacement.pdf', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Beleg entfernen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Beleg hinzufügen (optional)', exact: true })).toBeVisible()
  await input.setInputFiles({ name: 'replacement.pdf', mimeType: 'application/pdf', buffer: replacement })
  await page.getByRole('button', { name: 'Ausgabe hinzufügen', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByLabel('Beschreibung (optional)', { exact: true }).fill('Bearbeitete Testfahrkarte')
  await page.getByRole('button', { name: 'Änderungen übernehmen', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: '+ Ausgabe hinzufügen', exact: true }).click()
  await page.getByRole('radio', { name: 'Privat PKW', exact: true }).check()
  await chooseDate(page, 'Datum')
  await page.getByLabel('Gefahrene Kilometer', { exact: true }).fill('12')
  await page.getByLabel('Beschreibung (optional)', { exact: true }).fill('Testkilometer')
  await page.getByRole('button', { name: 'Ausgabe hinzufügen', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('[aria-labelledby="expense-group-transport"]')).toContainText('53,50')

  const backup = await download(page, 'Bericht als ZIP speichern')
  expect(backup.suggestedFilename()).toBe('2026-10-17_Reisekostenabrechnung.reisekosten')
  const backupBytes = await downloadBytes(backup)
  const archive = unzipSync(backupBytes)
  const manifest = JSON.parse(strFromU8(archive['report.json']!))
  expect(manifest.report.expenses).toHaveLength(2)
  expect(manifest.report.expenses[0]).toMatchObject({
    amountMinor: 4990,
    description: 'Bearbeitete Testfahrkarte',
  })
  expect(manifest.report.expenses[1].mileage).toEqual({ kilometers: 12, ratePerKilometerMinor: 30 })
  expect(Buffer.from(archive[manifest.report.expenses[0].receipt.path]!)).toEqual(replacement)

  await page.getByLabel('Nachname', { exact: true }).fill('Ersetzen')
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'saved.reisekosten', mimeType: 'application/zip', buffer: backupBytes,
  })
  await expect(page.getByLabel('Nachname', { exact: true })).toHaveValue('Test')
  const restored = unzipSync(await downloadBytes(await download(page, 'Bericht als ZIP speichern')))
  expect(JSON.parse(strFromU8(restored['report.json']!))).toEqual(manifest)
  expect(Buffer.from(restored[manifest.report.expenses[0].receipt.path]!)).toEqual(replacement)
  const pdfDownload = await download(page, 'Bericht als PDF herunterladen')
  expect(pdfDownload.suggestedFilename()).toBe('2026-10-17_Reisekostenabrechnung.pdf')
  const pdf = await PDFDocument.load(await downloadBytes(pdfDownload))
  expect(pdf.getPageCount()).toBe(4)
  expect(pdf.getTitle()).toBe('Reisekostenabrechnung')
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
  expect(errors).toEqual([])
  expect(failedAssets).toEqual([])
})

test('shows an unavailable total instead of overflowing for an imported report', async ({ page }) => {
  await page.goto('./')
  const draft = createEmptyReport()
  draft.expenses = [Number.MAX_SAFE_INTEGER, 1].map((amountMinor, index) => ({
    id: `expense-${index + 1}`,
    category: 'transport',
    mode: 'actual',
    date: '2026-10-17',
    description: '',
    receipt: null,
    amountMinor,
  }))
  const bytes = zipSync({
    'report.json': strToU8(JSON.stringify({ format: 'travel-expense-report', version: 1, report: draft })),
  }, { level: 0 })
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'overflow.reisekosten', mimeType: 'application/zip', buffer: Buffer.from(bytes),
  })
  await expect(page.locator('[aria-labelledby="expense-group-transport"] [role=alert]'))
    .toHaveText('nicht berechenbar')
})

test('keeps bundled rate fallback visible when the network is unavailable', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.goto('./')
  await expect(page.getByText(/Mitgelieferte Daten werden verwendet/)).toBeVisible()
})
