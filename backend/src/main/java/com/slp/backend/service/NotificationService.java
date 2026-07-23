package com.slp.backend.service;

import com.slp.backend.dto.response.NotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {
    NotificationResponse createNotification(Long userId, String title, String message);
    List<NotificationResponse> getUnreadNotifications(Long userId);
    Page<NotificationResponse> getUnreadNotifications(Long userId, Pageable pageable);
    Page<NotificationResponse> getNotifications(Long userId, Pageable pageable);
    long getUnreadCount(Long userId);
    void markAsRead(Long notificationId, Long userId);
    void markAllAsRead(Long userId);
}
