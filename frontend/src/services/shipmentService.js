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

  /** Authenticated lookup returning the full shipment (subject to ownership rules). */
  getByTrackingNumber: async (trackingNumber) => {
    const response = await api.get(`/api/shipments/tracking/${encodeURIComponent(trackingNumber)}`);
    return response.data;
  },

  /**
   * Anonymous lookup used by the public /track page. Returns a redacted projection
   * (no customer PII) and requires no bearer token.
   */
  getPublicTracking: async (trackingNumber) => {
    const response = await api.get(
      `/api/shipments/public/tracking/${encodeURIComponent(trackingNumber)}`,
    );
    return response.data;
  },

  getByStatus: async (status, page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/shipments/status/${status}?${params}`);
    return response.data;
  },

  /**
   * Shipments assigned to one driver.
   *
   * ADMIN / DISPATCHER only — the backend deliberately forbids a DRIVER from calling this so they
   * cannot enumerate another driver's work. A DRIVER wanting their own list must use `getAll()`,
   * which the server scopes to their assignments.
   */
  getByDriver: async (driverId) => {
    // Returns a plain list (not a page): a single driver's assignment set is always small.
    const response = await api.get(`/api/shipments/driver/${driverId}`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/shipments/${id}`);
    return response.data;
  },
};
