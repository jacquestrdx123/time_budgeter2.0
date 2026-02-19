import api from './api'

export const shiftService = {
  async list(params = {}) {
    const response = await api.get('/shifts/', { params })
    return response.data
  },

  async get(id) {
    const response = await api.get(`/shifts/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/shifts/', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.patch(`/shifts/${id}`, data)
    return response.data
  },

  async remove(id) {
    await api.delete(`/shifts/${id}`)
  },

  async getActive(userId) {
    const response = await api.get(`/shifts/active/${userId}`)
    return response.data
  },

  async clockIn(data) {
    const response = await api.post('/shifts/clock-in', data)
    return response.data
  },

  async clockOut(data) {
    const response = await api.post('/shifts/clock-out', data)
    return response.data
  },

  async listClockSessions(params = {}) {
    const response = await api.get('/clock-sessions/', { params })
    return response.data
  },
}
