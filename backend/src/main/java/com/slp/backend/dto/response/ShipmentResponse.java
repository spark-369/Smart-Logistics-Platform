package com.slp.backend.dto.response;

import com.slp.backend.entity.ShipmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ShipmentResponse {
    private Long id;
    private String trackingNumber;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String receiverName;
    private Long driverId;
    private String driverName;
    private Long vehicleId;
    private String vehiclePlate;
    private Long vehicleDriverId;
    private String vehicleDriverName;
    private ShipmentStatus status;
    private String originStreet;
    private String originCity;
    private String originState;
    private String originCountry;
    private String originZip;
    private String destStreet;
    private String destCity;
    private String destState;
    private String destCountry;
    private String destZip;
    private BigDecimal weight;
    private String description;
    private LocalDateTime estimatedDelivery;
    private LocalDateTime actualDelivery;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
