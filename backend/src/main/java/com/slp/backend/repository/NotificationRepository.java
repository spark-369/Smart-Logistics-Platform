package com.slp.backend.repository;

import com.slp.backend.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserIdAndReadFalse(Long userId, Pageable pageable);
    List<Notification> findByUserIdAndReadFalse(Long userId);
    Page<Notification> findByUserId(Long userId, Pageable pageable);
    List<Notification> findByUserId(Long userId);
    long countByUserIdAndReadFalse(Long userId);
}
