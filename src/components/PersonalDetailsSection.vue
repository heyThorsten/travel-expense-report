<script setup lang="ts">
import type { PersonalDetails, TripDetails } from '../domain/report'
import type { PersonalDetailsValidationErrors } from '../domain/personalDetailsValidation'
import type { TripValidationErrors } from '../domain/tripValidation'

const personalDetails = defineModel<PersonalDetails>({ required: true })
const trip = defineModel<TripDetails>('trip', { required: true })
defineProps<{
  personalDetailsErrors: PersonalDetailsValidationErrors
  validationErrors: TripValidationErrors
}>()
</script>

<template>
  <v-row class="mb-2">
    <v-col cols="12">
      <section aria-labelledby="personal-details-heading">
        <h2 id="personal-details-heading" class="text-h6 mb-4">
          Persönliche Daten
        </h2>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="personalDetails.lastName"
              label="Nachname"
              autocomplete="family-name"
              :error-messages="personalDetailsErrors.lastName"
              required
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="personalDetails.firstName"
              label="Vorname"
              autocomplete="given-name"
              :error-messages="personalDetailsErrors.firstName"
              required
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="personalDetails.personnelNumber"
              label="Personalnummer"
              autocomplete="off"
              :error-messages="
                personalDetailsErrors.personnelNumber
              "
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="personalDetails.department"
              label="Abteilung"
              autocomplete="organization"
              :error-messages="personalDetailsErrors.department"
            />
          </v-col>
        </v-row>
      </section>
    </v-col>
  
    <v-col cols="12" class="py-0">
      <v-divider class="my-2" />
    </v-col>
  
    <v-col cols="12">
      <section aria-labelledby="trip-details-heading">
        <h2 id="trip-details-heading" class="text-h6 mb-4">
          Reisedaten
        </h2>
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="trip.purpose"
              label="Reisezweck"
              autocomplete="off"
              :error-messages="validationErrors.purpose"
              required
            />
          </v-col>
  
        </v-row>
      </section>
    </v-col>
  </v-row>
</template>
