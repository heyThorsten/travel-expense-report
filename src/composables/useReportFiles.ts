import { computed, ref, type Ref } from 'vue'
import type { DestinationCountryOption } from '../domain/destinationOptions'
import type { MealAllowanceDay } from '../domain/mealAllowance'
import type { ReportDraft } from '../domain/report'
import {
  createReportArchive,
  openReportArchive,
  REPORT_ARCHIVE_EXTENSION,
} from '../domain/reportArchive'

interface ReportFilesOptions {
  report: ReportDraft
  reportArchiveInput: Readonly<Ref<HTMLInputElement | null>>
  tripIsValid: Readonly<Ref<boolean>>
  mealAllowanceDays: Readonly<Ref<MealAllowanceDay[]>>
  destinationCountries: Readonly<Ref<DestinationCountryOption[]>>
  validateReport: () => void
  restoreReport: (report: ReportDraft) => void
}

function downloadReport(bytes: Uint8Array, type: string, extension: string) {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  const objectUrl = URL.createObjectURL(
    new Blob([Uint8Array.from(bytes)], { type }),
  )
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `${date}_Reisekostenabrechnung${extension}`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export function useReportFiles(options: ReportFilesOptions) {
  const { reportArchiveInput } = options
  const isExportingReport = ref(false)
  const reportExportError = ref('')
  const isSavingReportArchive = ref(false)
  const isOpeningReportArchive = ref(false)
  const reportArchiveError = ref('')
  const isHandlingReportArchive = computed(
    () => isSavingReportArchive.value || isOpeningReportArchive.value,
  )

  function chooseReportArchive() {
    reportArchiveInput.value?.click()
  }

  async function saveReportArchive() {
    isSavingReportArchive.value = true
    reportArchiveError.value = ''
    try {
      downloadReport(
        await createReportArchive(options.report),
        'application/zip',
        REPORT_ARCHIVE_EXTENSION,
      )
    } catch (error) {
      reportArchiveError.value =
        error instanceof Error
          ? `Die ZIP-Datei konnte nicht erstellt werden: ${error.message}`
          : 'Die ZIP-Datei konnte nicht erstellt werden.'
    } finally {
      isSavingReportArchive.value = false
    }
  }

  async function openSelectedReportArchive() {
    const input = reportArchiveInput.value
    const file = input?.files?.item(0)
    if (input) input.value = ''
    if (!file) return

    reportArchiveError.value = ''
    if (!window.confirm(
      'Das Öffnen ersetzt alle aktuell erfassten Reisedaten, Ausgaben und Belege. Möchten Sie fortfahren?',
    )) return

    isOpeningReportArchive.value = true
    try {
      options.restoreReport(await openReportArchive(file))
      reportExportError.value = ''
    } catch (error) {
      reportArchiveError.value =
        error instanceof Error
          ? `Die ZIP-Datei konnte nicht geöffnet werden: ${error.message}`
          : 'Die ZIP-Datei konnte nicht geöffnet werden.'
    } finally {
      isOpeningReportArchive.value = false
    }
  }

  async function exportReportPdf() {
    options.validateReport()
    reportExportError.value = ''
    if (!options.tripIsValid.value) return

    isExportingReport.value = true
    try {
      const { createTravelReportPdf } = await import('../domain/reportPdf')
      downloadReport(
        await createTravelReportPdf(
          options.report,
          options.mealAllowanceDays.value,
          options.destinationCountries.value,
        ),
        'application/pdf',
        '.pdf',
      )
    } catch (error) {
      reportExportError.value =
        error instanceof Error
          ? `Der PDF-Bericht konnte nicht erstellt werden: ${error.message}`
          : 'Der PDF-Bericht konnte nicht erstellt werden.'
    } finally {
      isExportingReport.value = false
    }
  }

  return {
    isExportingReport,
    reportExportError,
    isSavingReportArchive,
    isOpeningReportArchive,
    reportArchiveError,
    isHandlingReportArchive,
    chooseReportArchive,
    saveReportArchive,
    openSelectedReportArchive,
    exportReportPdf,
  }
}
