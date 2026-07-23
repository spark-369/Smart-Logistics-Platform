package com.slp.backend.dto.response;

import com.slp.backend.entity.VehicleStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class VehicleResponse {
    private Long id;
    private String plateNumber;
    private String model;
    private String vehicleType;
    private VehicleStatus status;
    private BigDecimal capacity;
    private Long driverId;
    private String driverName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
