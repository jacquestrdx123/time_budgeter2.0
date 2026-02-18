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

  /** Singular label for Project (e.g. Project, Client, Engagement) */
  const projectDescription = computed(() => getValue('project_description', 'Project'))
  /** Plural form for menus/dashboards (adds 's') */
  const projectDescriptionPlural = computed(() => {
    const s = projectDescription.value ?? ''
    if (!s) return 'Projects'
    if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z') || s.endsWith('ch') || s.endsWith('sh')) return s + 'es'
    if (s.endsWith('y') && s.length > 1 && !/^[aeiou]/i.test(s.slice(-2, -1))) return s.slice(0, -1) + 'ies'
    return s + 's'
  })

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
    projectDescription,
    projectDescriptionPlural,
    updateSetting,
  }
})
