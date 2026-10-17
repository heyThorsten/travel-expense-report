<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatGermanDateWithWeekday } from '../domain/dateFormatting'

const props = defineProps<{
  modelValue: string
  label: string
  readonly?: boolean
  hint?: string
  min?: string
  errorMessages?: string | string[]
  required?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const menuOpen = ref(false)
const dateMenuOpen = ref(false)
const selectedDate = ref(props.modelValue.slice(0, 10))
const selectedTime = ref(props.modelValue.slice(11, 16))
const draftTime = ref('')

const minimumDate = computed(() => props.min?.slice(0, 10))
const minimumTime = computed(() =>
  props.min?.slice(0, 10) === selectedDate.value
    ? props.min.slice(11, 16)
    : undefined,
)
const dateLabel = computed(() => `${props.label}datum`)
const timeLabel = computed(() => `${props.label}zeit`)
const displayDate = computed(() =>
  formatGermanDateWithWeekday(selectedDate.value),
)

watch(
  () => props.modelValue,
  (value) => {
    selectedDate.value = value.slice(0, 10)
    selectedTime.value = value.slice(11, 16)
  },
)

watch(menuOpen, (isOpen) => {
  if (isOpen) draftTime.value = selectedTime.value
})

function updateDate(date: string | Date | null) {
  if (!date) return
  selectedDate.value =
    date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : date
  dateMenuOpen.value = false
  emitCompleteDateTime()
}

function applyTime() {
  selectedTime.value = draftTime.value
  menuOpen.value = false
  emitCompleteDateTime()
}

function emitCompleteDateTime() {
  if (selectedDate.value && selectedTime.value) {
    emit('update:modelValue', `${selectedDate.value}T${selectedTime.value}`)
  }
}
</script>

<template>
  <div class="d-flex ga-3">
    <v-menu v-model="dateMenuOpen" :disabled="readonly">
      <template #activator="{ props: activatorProps }">
        <v-text-field
          v-bind="activatorProps"
          :model-value="displayDate"
          :label="dateLabel"
          :readonly="true"
          :disabled="readonly"
          :hint="hint"
          :persistent-hint="Boolean(hint)"
          :required="required"
          class="flex-grow-1"
        />
      </template>
      <v-date-picker
        :model-value="selectedDate || undefined"
        :min="minimumDate"
        color="primary"
        first-day-of-week="1"
        weekday-format="short"
        @update:model-value="updateDate"
      />
    </v-menu>

    <v-menu
      v-model="menuOpen"
      :close-on-content-click="false"
      :disabled="readonly"
    >
      <template #activator="{ props: activatorProps }">
        <v-text-field
          v-bind="activatorProps"
          :model-value="selectedTime"
          :label="timeLabel"
          :readonly="true"
          :disabled="readonly"
          :error-messages="errorMessages"
          :required="required"
          class="flex-grow-1"
        />
      </template>
      <!-- Let buttons handle Enter before VMenu's keyboard-close handler. -->
      <v-card @keydown.enter.stop>
        <v-time-picker
          v-model="draftTime"
          :min="minimumTime"
          color="primary"
          format="24hr"
        />
        <v-card-actions>
          <v-spacer />
          <v-btn type="button" variant="text" @click="menuOpen = false">
            Abbrechen
          </v-btn>
          <v-btn type="button" color="primary" @click="applyTime">
            Übernehmen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
</template>
