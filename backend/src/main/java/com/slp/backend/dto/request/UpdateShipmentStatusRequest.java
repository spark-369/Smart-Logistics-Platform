package com.slp.backend.dto.request;

import com.slp.backend.entity.ShipmentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateShipmentStatusRequest {
    @NotNull(message = "Status is required")
    private ShipmentStatus status;
}