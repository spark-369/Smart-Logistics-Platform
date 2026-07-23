package com.slp.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TrackingEventRequest {
    @NotNull(message = "Shipment ID is required")
    private Long shipmentId;

    @NotBlank(message = "Status is required")
    private String status;

    @NotBlank(message = "Location is required")
    private String location;

    private String description;
}
