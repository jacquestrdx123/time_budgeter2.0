import api from './api'

export const userService = {
  async list() {
    const response = await api.get('/users/')
    return response.data
  },

  async get(id) {
    const response = await api.get(`/users/${id}`)
    return response.data
  },
}
