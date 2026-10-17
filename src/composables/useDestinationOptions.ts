import { onMounted, ref } from 'vue'
import { loadDestinationOptions, type DestinationCountryOption } from '../domain/destinationOptions'

export function useDestinationOptions() {
  const destinationCountries = ref<DestinationCountryOption[]>([])
  const isLoadingDestinationOptions = ref(true)
  const destinationOptionsError = ref('')
  const destinationOptionsNotice = ref('')

  onMounted(async () => {
    try {
      const result = await loadDestinationOptions()
      destinationCountries.value = result.countries
      destinationOptionsNotice.value = result.notice ?? ''
    } catch (error) {
      destinationOptionsError.value =
        error instanceof Error
          ? error.message
          : 'Die Länderliste konnte nicht geladen werden.'
    } finally {
      isLoadingDestinationOptions.value = false
    }
  })

  return {
    destinationCountries,
    isLoadingDestinationOptions,
    destinationOptionsError,
    destinationOptionsNotice,
  }
}
