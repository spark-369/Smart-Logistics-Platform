package com.slp.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ShipmentRequest {
    @NotNull(message = "Sender ID is required")
    private Long senderId;

    @NotNull(message = "Receiver ID is required")
    private Long receiverId;

    @NotBlank(message = "Origin street is required")
    private String originStreet;

    @NotBlank(message = "Origin city is required")
    private String originCity;

    @NotBlank(message = "Origin state is required")
    private String originState;

    @NotBlank(message = "Origin country is required")
    private String originCountry;

    @NotBlank(message = "Origin zip code is required")
    private String originZip;

    @NotBlank(message = "Destination street is required")
    private String destStreet;

    @NotBlank(message = "Destination city is required")
    private String destCity;

    @NotBlank(message = "Destination state is required")
    private String destState;

    @NotBlank(message = "Destination country is required")
    private String destCountry;

    @NotBlank(message = "Destination zip code is required")
    private String destZip;

    @DecimalMin(value = "0.0", inclusive = false, message = "Weight must be greater than 0")
    private BigDecimal weight;

    private String description;

    private Long vehicleId;
}
