<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { euroNumberToMinorUnits, formatEuroCurrency } from '../domain/currency'
import { formatGermanDateWithWeekday } from '../domain/dateFormatting'
import {
  type ExpenseFormValues,
  validateExpense,
} from '../domain/expenseValidation'
import { calculateMileageAmountMinor, isValidKilometers } from '../domain/mileage'
import {
  MAX_RECEIPT_SIZE_BYTES,
  validateReceiptFile,
} from '../domain/receipts'
import type {
  ExpenseCategory,
  ExpenseDraft,
  ReceiptAttachment,
} from '../domain/report'

const props = defineProps<{
  initialExpense?: ExpenseDraft | null
}>()

const emit = defineEmits<{
  save: [expense: ExpenseDraft]
  cancel: []
}>()

const categoryOptions: { title: string; value: ExpenseCategory }[] = [
  { title: 'Fahrtkosten', value: 'transport' },
  { title: 'Übernachtung', value: 'accommodation' },
  { title: 'Reisenebenkosten', value: 'other' },
]

const initialMileage =
  props.initialExpense?.mode === 'private-car-mileage'
    ? props.initialExpense.mileage
    : null
const initialAmountMinor =
  props.initialExpense?.mode === 'actual'
    ? props.initialExpense.amountMinor
    : null
const category = ref<ExpenseCategory>(
  props.initialExpense?.category ?? 'transport',
)
const mode = ref<'actual' | 'private-car-mileage'>(
  props.initialExpense?.mode ?? 'actual',
)
const date = ref(props.initialExpense?.date ?? '')
const description = ref(props.initialExpense?.description ?? '')
const amountValue = ref(
  initialAmountMinor === null ? null : initialAmountMinor / 100,
)
const kilometers = ref<number | null>(initialMileage?.kilometers ?? null)
const ratePerKilometer = ref(
  initialMileage?.ratePerKilometerMinor == null
    ? 0.3
    : initialMileage.ratePerKilometerMinor / 100,
)
const receipt = ref<ReceiptAttachment | null>(
  props.initialExpense?.receipt ?? null,
)
const expenseDateMenuOpen = ref(false)
const validationAttempted = ref(false)
const receiptError = ref('')
const isReadingReceipt = ref(false)
const receiptInput = ref<HTMLInputElement | null>(null)
const receiptPreviewUrl = ref<string | null>(null)
let activePreviewUrl: string | null = null

const formValues = computed<ExpenseFormValues>(() =>
  mode.value === 'private-car-mileage'
    ? {
        category: 'transport',
        mode: 'private-car-mileage',
        date: date.value,
        description: description.value,
        kilometers: kilometers.value,
        ratePerKilometer: ratePerKilometer.value,
      }
    : {
        category: category.value,
        mode: 'actual',
        date: date.value,
        description: description.value,
        amount: amountValue.value,
      },
)
const validationErrors = computed(() =>
  validationAttempted.value ? validateExpense(formValues.value) : {},
)
const expenseDateDisplay = computed(() =>
  formatGermanDateWithWeekday(date.value),
)
const mileageAmountMinor = computed(() => {
  const rate = euroNumberToMinorUnits(ratePerKilometer.value)
  return !isValidKilometers(kilometers.value) || rate === null
    ? null
    : calculateMileageAmountMinor(kilometers.value, rate)
})

watch(category, (nextCategory) => {
  if (nextCategory !== 'transport') mode.value = 'actual'
})
watch(mode, (nextMode) => {
  if (nextMode === 'private-car-mileage') {
    category.value = 'transport'
    receipt.value = null
  }
})

watch(
  receipt,
  (selectedReceipt) => {
    if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl)
    activePreviewUrl = selectedReceipt
      ? URL.createObjectURL(selectedReceipt.file)
      : null
    receiptPreviewUrl.value = activePreviewUrl
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (activePreviewUrl) URL.revokeObjectURL(activePreviewUrl)
})

function openReceiptPicker() {
  receiptInput.value?.click()
}

async function handleReceiptSelection(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.item(0)
  input.value = ''
  receiptError.value = ''

  if (!file) return

  isReadingReceipt.value = true
  try {
    const result = await validateReceiptFile(file)
    if (!result.valid) {
      receiptError.value = result.error
      return
    }

    receipt.value = result.attachment
  } catch {
    receiptError.value = `Der Beleg "${file.name}" konnte nicht gelesen werden.`
  } finally {
    isReadingReceipt.value = false
  }
}

function removeReceipt() {
  receipt.value = null
  receiptError.value = ''
}

function updateExpenseDate(selectedDate: string | Date | null) {
  if (!selectedDate) return
  date.value =
    selectedDate instanceof Date
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : selectedDate
  expenseDateMenuOpen.value = false
}

function formatFileSize(bytes: number): string {
  const mebibyte = 1024 * 1024
  const unitSize = bytes >= mebibyte ? mebibyte : 1024
  const unitLabel = bytes >= mebibyte ? 'MiB' : 'KiB'
  return `${new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 1,
  }).format(bytes / unitSize)} ${unitLabel}`
}

function saveExpense() {
  validationAttempted.value = true
  const errors = validateExpense(formValues.value)
  if (Object.keys(errors).length > 0 || isReadingReceipt.value) return

  const id = props.initialExpense?.id ?? ''
  if (mode.value === 'private-car-mileage') {
    const ratePerKilometerMinor = euroNumberToMinorUnits(
      ratePerKilometer.value,
    )
    if (!isValidKilometers(kilometers.value) || ratePerKilometerMinor === null) {
      return
    }

    if (
      calculateMileageAmountMinor(kilometers.value, ratePerKilometerMinor) ===
      null
    ) {
      return
    }

    emit('save', {
      id,
      category: 'transport',
      mode: 'private-car-mileage',
      date: date.value,
      description: description.value,
      mileage: { kilometers: kilometers.value, ratePerKilometerMinor },
      receipt: null,
    })
    return
  }

  const amountMinor = euroNumberToMinorUnits(amountValue.value)
  if (amountMinor === null || amountMinor <= 0) return

  emit('save', {
    id,
    category: category.value,
    mode: 'actual',
    date: date.value,
    description: description.value,
    amountMinor,
    receipt: receipt.value,
  })
}
</script>

<template>
  <v-card>
    <v-card-title>
      {{ initialExpense ? 'Ausgabe bearbeiten' : 'Ausgabe hinzufügen' }}
    </v-card-title>

    <v-card-text>
      <v-form novalidate @submit.prevent="saveExpense">
        <v-select
          v-model="category"
          :items="categoryOptions"
          item-title="title"
          item-value="value"
          label="Kategorie"
        />

        <v-radio-group
          v-if="category === 'transport'"
          v-model="mode"
          label="Verkehrsmittel"
          inline
        >
          <v-radio label="Bahn/Bus/Flugzeug" value="actual" />
          <v-radio label="Privat PKW" value="private-car-mileage" />
        </v-radio-group>

        <v-menu v-model="expenseDateMenuOpen">
          <template #activator="{ props: activatorProps }">
            <v-text-field
              v-bind="activatorProps"
              :model-value="expenseDateDisplay"
              label="Datum"
              readonly
              required
              :error-messages="validationErrors.date"
            />
          </template>
          <v-date-picker
            :model-value="date || undefined"
            color="primary"
            first-day-of-week="1"
            weekday-format="short"
            @update:model-value="updateExpenseDate"
          />
        </v-menu>

        <template v-if="mode === 'actual'">
          <v-number-input
            v-model="amountValue"
            label="Betrag"
            :min="0.01"
            :step="0.01"
            :precision="2"
            :min-fraction-digits="2"
            decimal-separator=","
            suffix="€"
            placeholder="0,00"
            required
            :error-messages="validationErrors.amount"
          />
        </template>

        <template v-else>
          <v-row>
            <v-col cols="12" sm="6">
              <v-number-input
                v-model="kilometers"
                label="Gefahrene Kilometer"
                :min="1"
                :step="1"
                :precision="0"
                suffix="km"
                placeholder="0"
                hint="Nur ganze Kilometer."
                required
                :error-messages="validationErrors.kilometers"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-number-input
                v-model="ratePerKilometer"
                label="Satz pro Kilometer"
                :min="0.01"
                :step="0.01"
                :precision="2"
                :min-fraction-digits="2"
                decimal-separator=","
                suffix="€/km"
                placeholder="0,30"
                required
                :error-messages="validationErrors.ratePerKilometer"
              />
            </v-col>
          </v-row>
          <v-alert
            v-if="mileageAmountMinor !== null"
            class="mb-4"
            type="info"
            variant="tonal"
            density="compact"
            role="status"
          >
            Erstattungsbetrag: {{ formatEuroCurrency(mileageAmountMinor) }}
          </v-alert>
        </template>

        <v-text-field
          v-model="description"
          label="Beschreibung (optional)"
          autocomplete="off"
        />

        <div v-if="mode !== 'private-car-mileage'" class="mb-4">
          <input
            ref="receiptInput"
            class="receipt-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            aria-label="Belegdatei auswählen"
            @change="handleReceiptSelection"
          />

          <div v-if="receipt" class="receipt-preview">
            <div class="d-flex align-center flex-wrap ga-2 mb-2">
              <span class="text-body-2">
                {{ receipt.file.name }}
                ({{ formatFileSize(receipt.file.size) }})
              </span>
              <v-btn
                type="button"
                size="small"
                variant="text"
                :loading="isReadingReceipt"
                :disabled="isReadingReceipt"
                @click="openReceiptPicker"
              >
                Beleg ersetzen
              </v-btn>
              <v-btn
                type="button"
                size="small"
                color="error"
                variant="text"
                :disabled="isReadingReceipt"
                @click="removeReceipt"
              >
                Beleg entfernen
              </v-btn>
            </div>

            <v-img
              v-if="receipt.mediaType !== 'application/pdf'"
              :src="receiptPreviewUrl ?? undefined"
              :alt="`Vorschau: ${receipt.file.name}`"
              max-height="240"
              class="receipt-image"
            />
            <iframe
              v-else-if="receiptPreviewUrl"
              :src="receiptPreviewUrl"
              :title="`PDF-Vorschau: ${receipt.file.name}`"
              class="receipt-pdf"
            />
          </div>

          <v-btn
            v-else
            type="button"
            variant="outlined"
            :loading="isReadingReceipt"
            :disabled="isReadingReceipt"
            @click="openReceiptPicker"
          >
            Beleg hinzufügen (optional)
          </v-btn>

          <p class="text-caption text-medium-emphasis mt-2">
            PDF, JPG oder PNG; maximal
            {{ formatFileSize(MAX_RECEIPT_SIZE_BYTES) }}. Dateien bleiben nur
            während der aktuellen Sitzung im Arbeitsspeicher.
          </p>
          <v-alert
            v-if="receiptError"
            class="mt-2"
            type="error"
            variant="tonal"
            role="alert"
          >
            {{ receiptError }}
          </v-alert>
        </div>

        <v-card-actions class="px-0">
          <v-spacer />
          <v-btn type="button" variant="text" @click="emit('cancel')">
            Abbrechen
          </v-btn>
          <v-btn
            type="submit"
            color="primary"
            variant="flat"
            :disabled="isReadingReceipt"
          >
            {{ initialExpense ? 'Änderungen übernehmen' : 'Ausgabe hinzufügen' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.receipt-input {
  display: none;
}

.receipt-image {
  max-width: 100%;
  object-fit: contain;
}

.receipt-pdf {
  width: 100%;
  height: 320px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
