import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { settingsService } from '@/services/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref([])
  const loaded = ref(false)
  const loading = ref(false)

  async function fetchSettings() {
    if (loading.value) return
    loading.value = true
    try {
      settings.value = await settingsService.list()
      loaded.value = true
    } catch {
      // silent — pages can fall back to defaults
    } finally {
      loading.value = false
    }
  }

  function getValue(key, defaultValue = '') {
    const s = settings.value.find(s => s.key === key)
    return s ? s.value : String(defaultValue)
  }

  function getNumber(key, defaultValue = 0) {
    const v = getValue(key, defaultValue)
    const n = Number(v)
    return isNaN(n) ? defaultValue : n
  }

  const dayStartHour = computed(() => getNumber('day_start_hour', 8))
  const dayEndHour = computed(() => getNumber('day_end_hour', 16))
  const dayHours = computed(() => getNumber('day_hours', 8))
  const companyName = computed(() => getValue('company_name', 'Our Team'))
  const weekStart = computed(() => getValue('week_start', 'monday'))

  async function updateSetting(key, value) {
    const updated = await settingsService.update(key, value)
    const idx = settings.value.findIndex(s => s.key === key)
    if (idx >= 0) {
      settings.value[idx] = updated
    } else {
      settings.value.push(updated)
    }
    return updated
  }

  return {
    settings,
    loaded,
    loading,
    fetchSettings,
    getValue,
    getNumber,
    dayStartHour,
    dayEndHour,
    dayHours,
    companyName,
    weekStart,
    updateSetting,
  }
})
