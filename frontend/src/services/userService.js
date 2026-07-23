import api from './api';

export const userService = {
  getAll: async (page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/users?${params}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },

  getByRole: async (role, page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/users/role/${role}?${params}`);
    return response.data;
  },

  getLookup: async () => {
    const response = await api.get('/api/users/lookup');
    return response.data;
  },

  create: async (userData) => {
    const response = await api.post('/api/users', userData);
    return response.data;
  },

  update: async (id, userData) => {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },
};
