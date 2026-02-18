import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { reminderService } from '@/services/reminders'
import { useToastStore } from '@/stores/toast'

export const useReminderStore = defineStore('reminders', () => {
  const reminders = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const reminderCount = computed(() => reminders.value.length)

  const upcomingCount = computed(() => {
    const now = new Date().toISOString()
    return reminders.value.filter((r) => !r.sent && r.trigger_at > now).length
  })

  async function fetchReminders() {
    loading.value = true
    try {
      reminders.value = await reminderService.list()
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load reminders')
    } finally {
      loading.value = false
    }
  }

  async function getReminder(id) {
    try {
      return await reminderService.get(id)
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load reminder')
      return null
    }
  }

  async function createReminder(data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const reminder = await reminderService.create(data)
      reminders.value.push(reminder)
      toast.success('Reminder created successfully')
      return reminder
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create reminder')
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateReminder(id, data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const updated = await reminderService.update(id, data)
      const idx = reminders.value.findIndex((r) => r.id === id)
      if (idx !== -1) reminders.value[idx] = updated
      toast.success('Reminder updated successfully')
      return updated
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update reminder')
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteReminder(id) {
    const toast = useToastStore()
    try {
      await reminderService.remove(id)
      reminders.value = reminders.value.filter((r) => r.id !== id)
      toast.success('Reminder deleted')
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete reminder')
      return false
    }
  }

  return {
    reminders,
    loading,
    saving,
    reminderCount,
    upcomingCount,
    fetchReminders,
    getReminder,
    createReminder,
    updateReminder,
    deleteReminder,
  }
})
