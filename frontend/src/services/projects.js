import api from './api'

export default {
  list() {
    return api.get('/projects/')
  },

  get(id) {
    return api.get(`/projects/${id}`)
  },

  create(data) {
    return api.post('/projects/', data)
  },

  update(id, data) {
    return api.patch(`/projects/${id}`, data)
  },

  delete(id) {
    return api.delete(`/projects/${id}`)
  },

  listTasks(id) {
    return api.get(`/projects/${id}/tasks`)
  },

  listShifts(id) {
    return api.get(`/projects/${id}/shifts`)
  },
}
