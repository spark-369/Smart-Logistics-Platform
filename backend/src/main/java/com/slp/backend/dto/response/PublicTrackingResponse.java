package com.slp.backend.dto.response;

import com.slp.backend.entity.ShipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Redacted shipment projection for the anonymous public tracking endpoint.
 *
 * <p>Deliberately omits personal data (full names, phone numbers, street addresses, weight and
 * internal identifiers) so that possession of a tracking number does not leak customer PII.
 */
@Data
@AllArgsConstructor
public class PublicTrackingResponse {
    private String trackingNumber;
    private ShipmentStatus status;
    private String originCity;
    private String originCountry;
    private String destCity;
    private String destCountry;
    private LocalDateTime estimatedDelivery;
    private LocalDateTime actualDelivery;
    private LocalDateTime createdAt;
    private List<TrackingEventResponse> events;
}
