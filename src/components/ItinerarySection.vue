<script setup lang="ts">
import DateTimePicker from './DateTimePicker.vue'
import type { DestinationCountryOption } from '../domain/destinationOptions'
import type { ItineraryStop } from '../domain/report'
import type { ItineraryStopValidationErrors } from '../domain/itineraryValidation'

const props = defineProps<{
  stops: ItineraryStop[]
  destinationCountries: DestinationCountryOption[]
  isLoadingDestinationOptions: boolean
  destinationOptionsError: string
  destinationOptionsNotice: string
  itineraryErrors: Record<string, ItineraryStopValidationErrors>
}>()
defineEmits<{
  add: []
  remove: [index: number]
}>()

function updateStopCountry(
  stop: ItineraryStop,
  countryCode: string | null | undefined,
) {
  const nextCountryCode = countryCode ?? ''
  if (stop.countryCode !== nextCountryCode) stop.cityOrRegion = ''
  stop.countryCode = nextCountryCode
}

function updateStopRegion(
  stop: ItineraryStop,
  region: string | null | undefined,
) {
  stop.cityOrRegion = region ?? ''
}

function regionsForCountry(countryCode: string): string[] {
  return (
    props.destinationCountries.find((country) => country.code === countryCode)
      ?.regions ?? []
  )
}

function regionHint(countryCode: string): string {
  if (!countryCode) return 'Bitte zuerst ein Land auswählen.'
  return regionsForCountry(countryCode).length > 0
    ? 'Wählen Sie bei Bedarf eine Stadt aus.'
    : 'Für dieses Land ist keine Stadt zur Auswahl verfügbar.'
}
</script>

<template>
  <section aria-labelledby="itinerary-heading">
    <h2 id="itinerary-heading" class="text-h6 mb-1">
      Reiseziele
    </h2>
  
    <v-alert
      v-if="destinationOptionsError"
      class="mb-4"
      type="error"
      variant="tonal"
      role="alert"
    >
      {{ destinationOptionsError }}
    </v-alert>
  
    <v-alert
      v-if="destinationOptionsNotice"
      class="mb-4"
      type="info"
      variant="tonal"
      role="status"
    >
      {{ destinationOptionsNotice }}
    </v-alert>
  
    <v-card
      v-for="(stop, index) in stops"
      :key="stop.id"
      class="mb-4"
      variant="outlined"
    >
      <v-card-text>
        <div
          class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3"
        >
          <h3 class="text-subtitle-1">
            <template v-if="stops.length > 1">
              Reiseziel {{ index + 1 }}
            </template>
            <template v-else>Reiseziel</template>
          </h3>
          <div
            v-if="index > 0"
            class="d-flex flex-wrap ga-2"
          >
            <v-btn
              type="button"
              size="small"
              color="error"
              variant="text"
              @click="$emit('remove', index)"
            >
              Entfernen
            </v-btn>
          </div>
        </div>
  
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="stop.destination"
              label="Ort oder Reiseziel"
              autocomplete="off"
              :error-messages="
                itineraryErrors[stop.id]?.destination
              "
              required
            />
          </v-col>
        </v-row>
  
        <v-row>
          <v-col cols="12" sm="6">
            <v-autocomplete
              :model-value="stop.countryCode"
              :items="destinationCountries"
              item-title="name"
              item-value="code"
              label="Land"
              placeholder="Land suchen"
              autocomplete="country"
              :loading="isLoadingDestinationOptions"
              :disabled="
                isLoadingDestinationOptions ||
                Boolean(destinationOptionsError)
              "
              @update:model-value="
                updateStopCountry(stop, $event)
              "
              :error-messages="
                itineraryErrors[stop.id]?.countryCode
              "
              required
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              :model-value="stop.cityOrRegion"
              :items="regionsForCountry(stop.countryCode)"
              label="Region/Stadt (optional)"
              clearable
              persistent-clear
              :hint="regionHint(stop.countryCode)"
              :disabled="
                !stop.countryCode ||
                regionsForCountry(stop.countryCode).length === 0
              "
              @update:model-value="
                updateStopRegion(stop, $event)
              "
            />
          </v-col>
        </v-row>
  
        <v-row>
          <v-col cols="12" sm="6">
            <DateTimePicker
              v-model="stop.startAt"
              :label="index === 0 ? 'Start' : 'Start (automatisch übernommen)'"
              :readonly="index > 0"
              :min="
                stops[index - 1]?.endAt ||
                undefined
              "
              :hint="
                index > 0
                  ? 'Entspricht dem Ende des vorherigen Reiseziels.'
                  : undefined
              "
              :error-messages="itineraryErrors[stop.id]?.startAt"
              required
            />
          </v-col>
          <v-col cols="12" sm="6">
            <DateTimePicker
              v-model="stop.endAt"
              label="Ende"
              :min="stop.startAt || undefined"
              :error-messages="
                itineraryErrors[stop.id]?.endAt
              "
              required
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  
    <v-btn
      type="button"
      variant="outlined"
      class="mb-6"
      @click="$emit('add')"
    >
      + Reiseziel hinzufügen
    </v-btn>
  </section>
</template>
