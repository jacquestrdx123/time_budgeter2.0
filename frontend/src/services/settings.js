import api from './api'

export const settingsService = {
  async list() {
    const response = await api.get('/settings/')
    return response.data
  },

  async get(key) {
    const response = await api.get(`/settings/${key}`)
    return response.data
  },

  async update(key, value) {
    const response = await api.put(`/settings/${key}`, { value: String(value) })
    return response.data
  },

  async create(data) {
    const response = await api.post('/settings/', data)
    return response.data
  },

  async remove(key) {
    await api.delete(`/settings/${key}`)
  },
}
