package com.slp.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private Long userId;
    private String title;
    private String message;
    private Boolean read;
    private LocalDateTime createdAt;
}
