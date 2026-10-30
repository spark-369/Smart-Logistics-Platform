package com.slp.backend.dto.request;

import com.slp.backend.entity.DriverStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Payload for {@code PATCH /api/drivers/{id}/status}. */
@Data
public class DriverStatusUpdateRequest {
    @NotNull(message = "Status is required")
    private DriverStatus status;
}
