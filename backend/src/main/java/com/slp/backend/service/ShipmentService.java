package com.slp.backend.service;

import com.slp.backend.dto.request.ShipmentRequest;
import com.slp.backend.dto.response.PublicTrackingResponse;
import com.slp.backend.dto.response.ShipmentResponse;
import com.slp.backend.entity.ShipmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ShipmentService {
    ShipmentResponse createShipment(ShipmentRequest request);
    ShipmentResponse getShipmentById(Long id);
    ShipmentResponse getShipmentByTrackingNumber(String trackingNumber);
    PublicTrackingResponse getPublicTracking(String trackingNumber);
    Page<ShipmentResponse> getAllShipments(Pageable pageable);
    Page<ShipmentResponse> getShipmentsByStatus(ShipmentStatus status, Pageable pageable);
    List<ShipmentResponse> getShipmentsByDriver(Long driverId);
    void deleteShipment(Long id);
}
