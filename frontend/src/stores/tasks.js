import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { taskService } from '@/services/tasks'
import projectService from '@/services/projects'
import { useToastStore } from '@/stores/toast'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref([])
  const projects = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const taskCount = computed(() => tasks.value.length)

  async function fetchTasks() {
    loading.value = true
    try {
      tasks.value = await taskService.list()
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load tasks')
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

  async function getTask(id) {
    try {
      return await taskService.get(id)
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load task')
      return null
    }
  }

  async function createTask(data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const task = await taskService.create(data)
      tasks.value.push(task)
      toast.success('Task created successfully')
      return task
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task')
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateTask(id, data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const updated = await taskService.update(id, data)
      const idx = tasks.value.findIndex((t) => t.id === id)
      if (idx !== -1) tasks.value[idx] = updated
      toast.success('Task updated successfully')
      return updated
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update task')
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteTask(id) {
    const toast = useToastStore()
    try {
      await taskService.remove(id)
      tasks.value = tasks.value.filter((t) => t.id !== id)
      toast.success('Task deleted')
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete task')
      return false
    }
  }

  return {
    tasks,
    projects,
    loading,
    saving,
    taskCount,
    fetchTasks,
    fetchProjects,
    getTask,
    createTask,
    updateTask,
    deleteTask,
  }
})
