import api from './api';

export const shipmentService = {
  create: async (shipmentData) => {
    const response = await api.post('/api/shipments', shipmentData);
    return response.data;
  },

  getAll: async (page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/shipments?${params}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/shipments/${id}`);
    return response.data;
  },

  getByTrackingNumber: async (trackingNumber) => {
    const response = await api.get(`/api/shipments/tracking/${trackingNumber}`);
    return response.data;
  },

  getByStatus: async (status, page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/shipments/status/${status}?${params}`);
    return response.data;
  },

  getByDriver: async (driverId) => {
    const response = await api.get(`/api/shipments/driver/${driverId}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/api/shipments/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/shipments/${id}`);
    return response.data;
  },
};
