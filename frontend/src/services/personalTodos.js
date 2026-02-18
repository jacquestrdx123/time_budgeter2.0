import api from './api'

export const personalTodoService = {
  async list() {
    const response = await api.get('/personal-todos/')
    return response.data
  },

  async get(id) {
    const response = await api.get(`/personal-todos/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/personal-todos/', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.patch(`/personal-todos/${id}`, data)
    return response.data
  },

  async remove(id) {
    await api.delete(`/personal-todos/${id}`)
  },
}
