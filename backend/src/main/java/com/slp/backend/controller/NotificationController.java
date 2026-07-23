package com.slp.backend.controller;

import com.slp.backend.dto.response.ApiResponse;
import com.slp.backend.dto.response.NotificationResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.service.NotificationService;
import com.slp.backend.util.CurrentUserUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Notification management APIs")
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUserUtil currentUserUtil;

    public NotificationController(NotificationService notificationService, CurrentUserUtil currentUserUtil) {
        this.notificationService = notificationService;
        this.currentUserUtil = currentUserUtil;
    }

    @PostMapping("/{userId}")
    @Operation(summary = "Create notification")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationResponse> createNotification(@PathVariable Long userId,
                                                                   @RequestParam String title,
                                                                   @RequestParam String message) {
        NotificationResponse response = notificationService.createNotification(userId, title, message);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/unread/{userId}")
    @Operation(summary = "Get unread notifications")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(@PathVariable Long userId) {
        validateNotificationAccess(userId);
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userId));
    }

    @GetMapping("/unread/{userId}/page")
    @Operation(summary = "Get unread notifications (paginated)")
    public ResponseEntity<Page<NotificationResponse>> getUnreadNotifications(@PathVariable Long userId, @PageableDefault(size = 20) Pageable pageable) {
        validateNotificationAccess(userId);
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userId, pageable));
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Get notifications")
    public ResponseEntity<Page<NotificationResponse>> getNotifications(@PathVariable Long userId, @PageableDefault(size = 20) Pageable pageable) {
        validateNotificationAccess(userId);
        return ResponseEntity.ok(notificationService.getNotifications(userId, pageable));
    }

    @GetMapping("/unread-count/{userId}")
    @Operation(summary = "Get unread notification count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Long userId) {
        validateNotificationAccess(userId);
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    @PatchMapping("/{notificationId}/read/{userId}")
    @Operation(summary = "Mark notification as read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long notificationId, @PathVariable Long userId) {
        validateNotificationAccess(userId);
        notificationService.markAsRead(notificationId, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Notification marked as read", null));
    }

    @PatchMapping("/read-all/{userId}")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@PathVariable Long userId) {
        validateNotificationAccess(userId);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "All notifications marked as read", null));
    }

    private void validateNotificationAccess(Long userId) {
        var currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (!currentUser.getId().equals(userId)) {
            throw new UnauthorizedException("You can only access your own notifications");
        }
    }
}
