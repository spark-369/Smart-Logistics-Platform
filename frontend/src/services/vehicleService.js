import api from './api';

export const vehicleService = {
  create: async (vehicleData) => {
    const response = await api.post('/api/vehicles', vehicleData);
    return response.data;
  },

  getAll: async (page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/vehicles?${params}`);
    return response.data;
  },

  getAssignable: async (page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/vehicles/assignable?${params}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/vehicles/${id}`);
    return response.data;
  },

  update: async (id, vehicleData) => {
    const response = await api.put(`/api/vehicles/${id}`, vehicleData);
    return response.data;
  },

  assignDriver: async (vehicleId, driverId) => {
    const response = await api.post(`/api/vehicles/${vehicleId}/assign/${driverId}`);
    return response.data;
  },

  unassignDriver: async (vehicleId) => {
    const response = await api.delete(`/api/vehicles/${vehicleId}/unassign`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/vehicles/${id}`);
    return response.data;
  },
};
