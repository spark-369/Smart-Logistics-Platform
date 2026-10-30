import api from './api';

export const driverService = {
  getAll: async (page = 0, size = 10, sort = 'id,asc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/drivers?${params}`);
    return response.data;
  },

  getAvailable: async (page = 0, size = 10, sort = 'id,asc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/drivers/available?${params}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/drivers/${id}`);
    return response.data;
  },

  /**
   * Resolves the driver profile belonging to the signed-in user.
   *
   * Used by the tracking page so a DRIVER only ever sees the shipments assigned to them, instead
   * of the whole fleet (which the backend would reject with 403 on write anyway).
   */
  getMine: async () => {
    const response = await api.get('/api/drivers/me');
    return response.data;
  },

  create: async (userId) => {
    const response = await api.post(`/api/drivers/${userId}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    // The backend binds this to DriverStatusUpdateRequest, i.e. a JSON object - not a raw string.
    const response = await api.patch(`/api/drivers/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/drivers/${id}`);
    return response.data;
  },
};
