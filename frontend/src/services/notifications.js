import api from './api'

export const notificationService = {
  /**
   * List notifications for the current user.
   * @param {boolean} unreadOnly
   */
  async list(unreadOnly = false) {
    const params = unreadOnly ? { unread_only: true } : {}
    const { data } = await api.get('/notifications/', { params })
    return data
  },

  /** Get unread notification count. */
  async unreadCount() {
    const { data } = await api.get('/notifications/unread-count')
    return data.unread_count
  },

  /** Get a single notification. */
  async get(id) {
    const { data } = await api.get(`/notifications/${id}`)
    return data
  },

  /** Mark a notification as read. */
  async markRead(id) {
    const { data } = await api.patch(`/notifications/${id}/read`)
    return data
  },

  /** Mark all notifications as read. */
  async markAllRead() {
    const { data } = await api.post('/notifications/mark-all-read')
    return data
  },

  /** Delete a notification. */
  async remove(id) {
    await api.delete(`/notifications/${id}`)
  },

  /** Get notification preferences. */
  async getPreferences() {
    const { data } = await api.get('/notifications/preferences/me')
    return data
  },

  /** Update notification preferences. */
  async updatePreferences(prefs) {
    const { data } = await api.put('/notifications/preferences/me', prefs)
    return data
  },

  /** List registered FCM devices. */
  async listDevices() {
    const { data } = await api.get('/notifications/devices/me')
    return data
  },

  /** Register an FCM device token. */
  async registerDevice(token, deviceName = null) {
    const { data } = await api.post('/notifications/devices', {
      token,
      device_name: deviceName,
    })
    return data
  },

  /** Remove an FCM device. */
  async removeDevice(deviceId) {
    await api.delete(`/notifications/devices/${deviceId}`)
  },

  /** Send a test push notification to the current user. */
  async testPush() {
    const { data } = await api.post('/notifications/test-push')
    return data
  },
}
