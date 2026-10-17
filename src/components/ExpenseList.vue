<script setup lang="ts">
import { computed } from 'vue'
import { formatEuroCurrency } from '../domain/currency'
import { formatGermanDateWithWeekday as formatDate } from '../domain/dateFormatting'
import { expenseAmountMinor, groupExpenses, transportModeLabel } from '../domain/expenseCalculations'
import type { ExpenseDraft } from '../domain/report'

const props = defineProps<{ expenses: ExpenseDraft[] }>()
defineEmits<{
  add: []
  edit: [expense: ExpenseDraft]
  remove: [id: string]
}>()
const expenseGroups = computed(() => groupExpenses(props.expenses))

function formatExpenseAmount(expense: ExpenseDraft): string | null {
  const amount = expenseAmountMinor(expense)
  return amount === null ? null : formatEuroCurrency(amount)
}

function mileageDetails(expense: ExpenseDraft): string | null {
  if (expense.mode !== 'private-car-mileage') return null
  const { kilometers, ratePerKilometerMinor } = expense.mileage
  if (kilometers === null || ratePerKilometerMinor === null) return null
  return `${kilometers} km × ${formatEuroCurrency(ratePerKilometerMinor)}/km`
}
</script>

<template>
  <section aria-labelledby="expenses-heading">
    <div
      class="mb-4"
    >
      <div>
        <h2 id="expenses-heading" class="text-h6 mb-1">
          Ausgaben
        </h2>
        <p class="text-body-2 text-medium-emphasis">
          Erfassen Sie tatsächliche Ausgaben oder eine Kilometerpauschale.
        </p>
      </div>
    </div>
  
    <p
      v-if="expenses.length === 0"
      class="text-body-2 text-medium-emphasis mb-4"
    >
      Noch keine Ausgaben hinzugefügt.
    </p>
  
    <section
      v-for="group in expenseGroups"
      :key="group.category"
      class="mb-4"
      :aria-labelledby="`expense-group-${group.category}`"
    >
      <div
        class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2"
      >
        <h3
          :id="`expense-group-${group.category}`"
          class="text-subtitle-1"
        >
          {{ group.label }}
        </h3>
        <div class="text-body-2 font-weight-medium">
          Summe:
          <strong v-if="group.totalMinor !== null">
            {{ formatEuroCurrency(group.totalMinor) }}
          </strong>
          <span v-else class="text-error" role="alert">
            nicht berechenbar
          </span>
        </div>
      </div>
  
      <v-card
        v-for="expense in group.expenses"
        :key="expense.id"
        class="mb-2"
        variant="outlined"
      >
        <v-card-text class="py-2 px-3">
          <v-row align="center" dense>
            <v-col cols="12" sm="3" md="2">
              {{ formatDate(expense.date) }}
            </v-col>
            <v-col cols="12" sm="3" md="2" class="font-weight-medium">
              <span v-if="formatExpenseAmount(expense) !== null">
                {{ formatExpenseAmount(expense) }}
              </span>
              <span v-else class="text-error" role="alert">
                nicht berechenbar
              </span>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-chip
                v-if="transportModeLabel(expense)"
                size="small"
                variant="tonal"
                class="mb-1"
              >
                {{ transportModeLabel(expense) }}
              </v-chip>
              <div v-if="expense.description">
                {{ expense.description }}
              </div>
              <div
                v-if="mileageDetails(expense)"
                class="text-caption text-medium-emphasis"
              >
                {{ mileageDetails(expense) }}
              </div>
              <v-checkbox
                v-if="
                  expense.receipt &&
                  expense.mode !== 'private-car-mileage'
                "
                :model-value="true"
                label="Beleg vorhanden"
                density="compact"
                hide-details
                disabled
                class="mt-1"
              />
            </v-col>
            <v-col cols="12" md="4" class="d-flex justify-end ga-1">
              <v-btn
                type="button"
                size="small"
                variant="text"
                @click="$emit('edit', expense)"
              >
                Bearbeiten
              </v-btn>
              <v-btn
                type="button"
                size="small"
                color="error"
                variant="text"
                @click="$emit('remove', expense.id)"
              >
                Entfernen
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>
  
    <v-btn
      type="button"
      variant="outlined"
      class="mb-6"
      @click="$emit('add')"
    >
      + Ausgabe hinzufügen
    </v-btn>
  </section>
</template>
