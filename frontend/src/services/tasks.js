import api from './api'

export const taskService = {
  async list() {
    const response = await api.get('/tasks/')
    return response.data
  },

  async get(id) {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/tasks/', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.patch(`/tasks/${id}`, data)
    return response.data
  },

  async remove(id) {
    await api.delete(`/tasks/${id}`)
  },
}
