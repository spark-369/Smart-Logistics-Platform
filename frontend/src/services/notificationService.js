import api from './api';

export const notificationService = {
  create: async (userId, title, message) => {
    const params = new URLSearchParams({ title, message });
    const response = await api.post(`/api/notifications/${userId}?${params}`);
    return response.data;
  },

  getByUserId: async (userId, page = 0, size = 10, sort = 'createdAt,desc') => {
    const params = new URLSearchParams({ page: String(page), size: String(size), sort });
    const response = await api.get(`/api/notifications/${userId}?${params}`);
    return response.data;
  },

  getUnread: async (userId) => {
    const response = await api.get(`/api/notifications/unread/${userId}`);
    return response.data;
  },

  getUnreadCount: async (userId) => {
    const response = await api.get(`/api/notifications/unread-count/${userId}`);
    return response.data;
  },

  markAsRead: async (notificationId, userId) => {
    const response = await api.patch(`/api/notifications/${notificationId}/read/${userId}`);
    return response.data;
  },

  markAllAsRead: async (userId) => {
    const response = await api.patch(`/api/notifications/read-all/${userId}`);
    return response.data;
  },
};
