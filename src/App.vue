<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import ExpenseForm from './components/ExpenseForm.vue'
import ExpenseList from './components/ExpenseList.vue'
import ItinerarySection from './components/ItinerarySection.vue'
import MealAllowanceSection from './components/MealAllowanceSection.vue'
import PersonalDetailsSection from './components/PersonalDetailsSection.vue'
import { useDestinationOptions } from './composables/useDestinationOptions'
import { useReportDraft } from './composables/useReportDraft'
import { useReportFiles } from './composables/useReportFiles'
import { calculateMealAllowanceDays } from './domain/mealAllowance'
import { REPORT_ARCHIVE_EXTENSION } from './domain/reportArchive'

const {
  report,
  validationAttempted,
  validationErrors,
  personalDetailsErrors,
  itineraryErrors,
  tripIsValid,
  expenseDialog,
  editingExpense,
  validateReport,
  addItineraryStop,
  removeItineraryStop,
  openNewExpense,
  editExpense,
  saveExpense,
  removeExpense,
  restoreReport,
} = useReportDraft()
const {
  destinationCountries,
  isLoadingDestinationOptions,
  destinationOptionsError,
  destinationOptionsNotice,
} = useDestinationOptions()
const mealAllowanceDays = computed(() =>
  isLoadingDestinationOptions.value
    ? []
    : calculateMealAllowanceDays(
        report.itineraryStops,
        destinationCountries.value,
        report.mealSelectionsByDate,
      ).filter(day => !report.excludedMealAllowanceDates.includes(day.date)),
)
const reportArchiveInput = useTemplateRef<HTMLInputElement>('reportArchiveInput')
const {
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
} = useReportFiles({
  report,
  reportArchiveInput,
  tripIsValid,
  mealAllowanceDays,
  destinationCountries,
  validateReport,
  restoreReport,
})
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="report-container py-8 py-sm-12">
        <header class="mb-6 d-flex align-center justify-space-between flex-wrap ga-4">
          <h1 class="report-title text-h4 mb-0">Reisekostenabrechnung</h1>
          <input
            ref="reportArchiveInput"
            class="d-none"
            type="file"
            :accept="REPORT_ARCHIVE_EXTENSION"
            @change="openSelectedReportArchive"
          />
          <v-btn
            type="button"
            variant="outlined"
            :loading="isOpeningReportArchive"
            :disabled="isHandlingReportArchive"
            @click="chooseReportArchive"
          >
            Gespeicherten Bericht öffnen
          </v-btn>
        </header>
        <v-alert
          v-if="reportArchiveError"
          class="mb-4"
          type="error"
          variant="tonal"
          role="alert"
        >
          {{ reportArchiveError }}
        </v-alert>

        <v-card variant="outlined">
          <v-card-text>
            <v-form novalidate @submit.prevent="validateReport">
              <PersonalDetailsSection
                v-model="report.personalDetails"
                v-model:trip="report.trip"
                :personal-details-errors="personalDetailsErrors"
                :validation-errors="validationErrors"
              />
              <v-divider class="my-4" />
              <ItinerarySection
                :stops="report.itineraryStops"
                :destination-countries="destinationCountries"
                :is-loading-destination-options="isLoadingDestinationOptions"
                :destination-options-error="destinationOptionsError"
                :destination-options-notice="destinationOptionsNotice"
                :itinerary-errors="itineraryErrors"
                @add="addItineraryStop"
                @remove="removeItineraryStop"
              />
              <template v-if="mealAllowanceDays.length > 0">
                <v-divider class="my-4" />
                <MealAllowanceSection
                  v-model:selections="report.mealSelectionsByDate"
                  :meal-allowance-days="mealAllowanceDays"
                  @remove-day="report.excludedMealAllowanceDates.push($event)"
                />
              </template>
              <v-divider class="my-4" />
              <ExpenseList
                :expenses="report.expenses"
                @add="openNewExpense"
                @edit="editExpense"
                @remove="removeExpense"
              />
            </v-form>
          </v-card-text>
        </v-card>

        <div class="d-flex align-center flex-wrap ga-4 mt-4">
          <v-btn
            type="button"
            color="primary"
            variant="flat"
            :loading="isExportingReport"
            :disabled="validationAttempted && !tripIsValid"
            @click="exportReportPdf"
          >
            Bericht als PDF herunterladen
          </v-btn>
          <v-btn
            type="button"
            variant="outlined"
            :loading="isSavingReportArchive"
            :disabled="isHandlingReportArchive"
            @click="saveReportArchive"
          >
            Bericht als ZIP speichern
          </v-btn>
          <p
            v-if="validationAttempted && tripIsValid"
            class="text-body-2 text-success"
            role="status"
          >
            Alle erforderlichen Angaben sind vollständig.
          </p>
        </div>
        <v-alert
          v-if="reportExportError"
          class="mt-4"
          type="error"
          variant="tonal"
          role="alert"
        >
          {{ reportExportError }}
        </v-alert>
        <v-dialog v-model="expenseDialog" max-width="640">
          <ExpenseForm
            v-if="expenseDialog"
            :initial-expense="editingExpense"
            @save="saveExpense"
            @cancel="expenseDialog = false"
          />
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.report-container {
  max-width: 1280px;
}

.report-title {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}
</style>
