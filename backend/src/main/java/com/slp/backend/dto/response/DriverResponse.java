package com.slp.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class DriverResponse {
    private Long id;
    private String licenseNumber;
    private Long userId;
    private String userName;
    private String email;
    private String phoneNumber;
    private String status;
    private Long vehicleId;
    private String vehiclePlate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
