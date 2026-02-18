import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { personalTodoService } from '@/services/personalTodos'
import { useToastStore } from '@/stores/toast'

export const usePersonalTodoStore = defineStore('personalTodos', () => {
  const todos = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const todoCount = computed(() => todos.value.length)

  async function fetchTodos() {
    loading.value = true
    try {
      todos.value = await personalTodoService.list()
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load personal todos')
    } finally {
      loading.value = false
    }
  }

  async function getTodo(id) {
    try {
      return await personalTodoService.get(id)
    } catch (err) {
      const toast = useToastStore()
      toast.error(err.response?.data?.detail || 'Failed to load todo')
      return null
    }
  }

  async function createTodo(data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const todo = await personalTodoService.create(data)
      todos.value.push(todo)
      toast.success('Todo created successfully')
      return todo
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create todo')
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateTodo(id, data) {
    const toast = useToastStore()
    saving.value = true
    try {
      const updated = await personalTodoService.update(id, data)
      const idx = todos.value.findIndex((t) => t.id === id)
      if (idx !== -1) todos.value[idx] = updated
      toast.success('Todo updated successfully')
      return updated
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update todo')
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteTodo(id) {
    const toast = useToastStore()
    try {
      await personalTodoService.remove(id)
      todos.value = todos.value.filter((t) => t.id !== id)
      toast.success('Todo deleted')
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete todo')
      return false
    }
  }

  return {
    todos,
    loading,
    saving,
    todoCount,
    fetchTodos,
    getTodo,
    createTodo,
    updateTodo,
    deleteTodo,
  }
})
