package com.slp.backend.dto.request;

import com.slp.backend.entity.VehicleStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class VehicleRequest {
    @NotBlank(message = "Plate number is required")
    private String plateNumber;

    @NotBlank(message = "Model is required")
    private String model;

    @NotBlank(message = "Vehicle type is required")
    private String vehicleType;

    @NotNull(message = "Capacity is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Capacity must be greater than 0")
    private BigDecimal capacity;

    @NotNull(message = "Status is required")
    private VehicleStatus status;

    private Long driverId;
}
