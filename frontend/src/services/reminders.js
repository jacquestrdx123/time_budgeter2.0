import api from './api'

export const reminderService = {
  async list() {
    const response = await api.get('/reminders/')
    return response.data
  },

  async get(id) {
    const response = await api.get(`/reminders/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/reminders/', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.patch(`/reminders/${id}`, data)
    return response.data
  },

  async remove(id) {
    await api.delete(`/reminders/${id}`)
  },
}
