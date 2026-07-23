package com.slp.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class TrackingEventResponse {
    private Long id;
    private Long shipmentId;
    private String status;
    private String location;
    private String description;
    private LocalDateTime timestamp;
}
