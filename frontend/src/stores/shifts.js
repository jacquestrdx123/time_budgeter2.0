import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { shiftService } from '@/services/shifts'
import projectService from '@/services/projects'
import { useToastStore } from '@/stores/toast'

export const useShiftStore = defineStore('shifts', () => {
  const shifts = ref([])
  const projects = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const shiftCount = computed(() => shifts.value.length)

  async function fetchShifts() {
    loading.value = true
    try {
      shifts.value = await shiftService.list()
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load shifts')
    } finally {
      loading.value = false
    }
  }

  async function fetchProjects() {
    try {
      const response = await projectService.list()
      projects.value = response.data
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load projects')
    }
  }

  async function getShift(id) {
    try {
      return await shiftService.get(id)
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load shift')
      return null
    }
  }

  async function createShift(data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const shift = await shiftService.create(data)
      shifts.value.push(shift)
      toast.success('Shift created successfully')
      return shift
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create shift')
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateShift(id, data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const updated = await shiftService.update(id, data)
      const idx = shifts.value.findIndex((s) => s.id === id)
      if (idx !== -1) shifts.value[idx] = updated
      toast.success('Shift updated successfully')
      return updated
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update shift')
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteShift(id) {
    const toast = useToastStore()
    try {
      await shiftService.remove(id)
      shifts.value = shifts.value.filter((s) => s.id !== id)
      toast.success('Shift deleted')
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete shift')
      return false
    }
  }

  return {
    shifts,
    projects,
    loading,
    saving,
    shiftCount,
    fetchShifts,
    fetchProjects,
    getShift,
    createShift,
    updateShift,
    deleteShift,
  }
})
