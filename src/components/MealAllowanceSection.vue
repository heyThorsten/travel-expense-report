<script setup lang="ts">
import { computed } from 'vue'
import { formatEuroCurrency } from '../domain/currency'
import { sumAmounts } from '../domain/expenseCalculations'
import type { MealAllowanceDay } from '../domain/mealAllowance'
import type { MealSelections } from '../domain/report'

const props = defineProps<{ mealAllowanceDays: MealAllowanceDay[] }>()
defineEmits<{
  removeDay: [date: string]
}>()
const selections = defineModel<Record<string, MealSelections>>('selections', { required: true })
const mealAllowanceTotalMinor = computed(() =>
  props.mealAllowanceDays.length === 0
    ? null
    : sumAmounts(props.mealAllowanceDays.map(day => day.payableAmountMinor)),
)

function setMealSelection(
  date: string,
  meal: keyof MealSelections,
  selected: boolean | null,
) {
  const currentSelections = selections.value[date] ?? {
    breakfast: false,
    lunch: false,
    dinner: false,
  }
  selections.value[date] = {
    ...currentSelections,
    [meal]: selected === true,
  }
}

function mealSelected(
  day: MealAllowanceDay,
  meal: keyof MealSelections,
): boolean {
  return selections.value[day.date]?.[meal] ?? false
}

function formatMealDate(date: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}
</script>

<template>
  <section aria-labelledby="meal-allowance-heading">
  <h2 id="meal-allowance-heading" class="text-h6 mb-1">
    Verpflegungsmehraufwand
  </h2>
  <p class="text-body-2 text-medium-emphasis mb-4">
    Für eintägige Reisen wird die Pauschale bei mehr als 8 Stunden
    Abwesenheit angesetzt. Bei mehrtägiger Abwesenheit mit
    Übernachtung gelten nicht ganztägige erste und letzte Tage
    als Reisetage; vollständig abwesende Kalendertage werden
    voll angesetzt.
    Gestellte Mahlzeiten mindern die Pauschale um 20 % für
    Frühstück und jeweils 40 % für Mittag- und Abendessen.
  </p>
  
  <v-card
    v-for="day in mealAllowanceDays"
    :key="day.date"
    class="mb-2"
    variant="outlined"
  >
    <v-card-text class="py-2">
      <v-row align="center" dense>
        <v-col cols="12" md="3">
          <div class="text-body-2 font-weight-medium">
            {{ formatMealDate(day.date) }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ day.kind === 'full' ? 'Voller Tag' : '8 Stunden' }}
            · {{ day.countryName }}
            <span v-if="day.region">, {{ day.region }}</span>
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <div
            class="text-caption font-weight-medium mb-1"
            :id="`provided-meals-${day.date}`"
          >
            Gestellte Mahlzeit
          </div>
          <div
            class="d-flex flex-wrap align-center ga-2"
            role="group"
            :aria-labelledby="`provided-meals-${day.date}`"
          >
            <v-checkbox
              :model-value="mealSelected(day, 'breakfast')"
              label="Frühstück"
              density="compact"
              hide-details
              class="ma-0"
              @update:model-value="
                setMealSelection(day.date, 'breakfast', $event)
              "
            />
            <v-checkbox
              :model-value="mealSelected(day, 'lunch')"
              label="Mittagessen"
              density="compact"
              hide-details
              class="ma-0"
              @update:model-value="
                setMealSelection(day.date, 'lunch', $event)
              "
            />
            <v-checkbox
              :model-value="mealSelected(day, 'dinner')"
              label="Abendessen"
              density="compact"
              hide-details
              class="ma-0"
              @update:model-value="
                setMealSelection(day.date, 'dinner', $event)
              "
            />
          </div>
        </v-col>
        <v-col cols="12" md="2" class="text-md-right">
          <v-alert
            v-if="day.baseAmountMinor === null"
            type="error"
            variant="tonal"
            density="compact"
            role="alert"
          >
            Für {{ day.countryName }} ist am {{ day.date }} kein
            Pauschbetrag verfügbar.
          </v-alert>
          <div v-else class="text-body-2">
            {{ formatEuroCurrency(day.baseAmountMinor) }}
            − {{ formatEuroCurrency(day.deductionMinor) }}
            =
            <strong>
              {{
                formatEuroCurrency(day.payableAmountMinor ?? 0)
              }}
            </strong>
          </div>
        </v-col>
        <v-col cols="12" md="1" class="d-flex justify-end">
          <v-btn
            type="button"
            size="small"
            color="error"
            variant="text"
            :aria-label="`Verpflegungsmehraufwand für ${formatMealDate(day.date)} entfernen`"
            @click="$emit('removeDay', day.date)"
          >
            Entfernen
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
  
  <p
    v-if="mealAllowanceTotalMinor !== null"
    class="text-body-1 font-weight-bold text-right mb-4"
    role="status"
  >
    Gesamtbetrag:
    {{ formatEuroCurrency(mealAllowanceTotalMinor) }}
  </p>
  <p v-else class="text-body-1 text-error text-right mb-4" role="alert">
    Gesamtbetrag: nicht berechenbar
  </p>
  </section>
</template>
