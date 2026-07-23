import api from './api';

export const trackingService = {
  createEvent: async (eventData) => {
    const response = await api.post('/api/tracking', eventData);
    return response.data;
  },

  getByShipmentId: async (shipmentId) => {
    const response = await api.get(`/api/tracking/shipment/${shipmentId}`);
    return response.data;
  },

  getByShipmentIdPage: async (shipmentId, page = 0, size = 10, sort = 'timestamp,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/tracking/shipment/${shipmentId}/page?${params}`);
    return response.data;
  },
};
