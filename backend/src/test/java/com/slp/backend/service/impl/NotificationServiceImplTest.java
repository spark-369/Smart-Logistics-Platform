package com.slp.backend.service.impl;

import com.slp.backend.dto.response.NotificationResponse;
import com.slp.backend.entity.Notification;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.repository.NotificationRepository;
import com.slp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for {@link NotificationServiceImpl}. */
@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationServiceImpl")
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private User user;
    private Notification notification;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L).email("user@slp.test").firstName("Uma").lastName("User")
                .password("encoded").role(Role.CUSTOMER).enabled(true)
                .build();
        notification = Notification.builder()
                .id(50L).user(user).title("Shipment created")
                .message("Your shipment has been created").read(false)
                .build();
    }

    @Test
    @DisplayName("createNotification persists an unread notification for the target user")
    void createNotification() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(notificationRepository.save(any(Notification.class))).thenReturn(notification);

        NotificationResponse response = notificationService.createNotification(
                1L, "Shipment created", "Your shipment has been created");

        assertThat(response.getId()).isEqualTo(50L);
        assertThat(response.getUserId()).isEqualTo(1L);
        assertThat(response.getRead()).isFalse();
        assertThat(response.getTitle()).isEqualTo("Shipment created");
    }

    @Test
    @DisplayName("createNotification rejects an unknown recipient")
    void createNotificationUnknownUser() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.createNotification(99L, "t", "m"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getNotifications returns a mapped page")
    void getNotifications() {
        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByUserId(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(notification), pageable, 1));

        Page<NotificationResponse> page = notificationService.getNotifications(1L, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getMessage()).isEqualTo("Your shipment has been created");
    }

    @Test
    @DisplayName("getUnreadNotifications returns only unread entries")
    void getUnreadNotifications() {
        when(notificationRepository.findByUserIdAndReadFalse(1L)).thenReturn(List.of(notification));

        List<NotificationResponse> unread = notificationService.getUnreadNotifications(1L);

        assertThat(unread).hasSize(1);
        assertThat(unread.get(0).getRead()).isFalse();
    }

    @Test
    @DisplayName("getUnreadCount delegates to the repository count")
    void getUnreadCount() {
        when(notificationRepository.countByUserIdAndReadFalse(1L)).thenReturn(3L);

        assertThat(notificationService.getUnreadCount(1L)).isEqualTo(3L);
    }

    @Test
    @DisplayName("markAsRead flips the read flag for the owning user")
    void markAsRead() {
        when(notificationRepository.findById(50L)).thenReturn(Optional.of(notification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        notificationService.markAsRead(50L, 1L);

        assertThat(notification.getRead()).isTrue();
        verify(notificationRepository).save(notification);
    }

    @Test
    @DisplayName("markAsRead refuses a notification owned by somebody else")
    void markAsReadRejectsForeignNotification() {
        when(notificationRepository.findById(50L)).thenReturn(Optional.of(notification));

        assertThatThrownBy(() -> notificationService.markAsRead(50L, 999L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("does not belong");
    }

    @Test
    @DisplayName("markAsRead reports a missing notification")
    void markAsReadUnknown() {
        when(notificationRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead(404L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("markAllAsRead flags every unread notification of the user")
    void markAllAsRead() {
        Notification second = Notification.builder()
                .id(51L).user(user).title("Second").message("Second message").read(false).build();
        when(notificationRepository.findByUserIdAndReadFalse(1L)).thenReturn(List.of(notification, second));

        notificationService.markAllAsRead(1L);

        assertThat(notification.getRead()).isTrue();
        assertThat(second.getRead()).isTrue();
        verify(notificationRepository).saveAll(List.of(notification, second));
    }
}
