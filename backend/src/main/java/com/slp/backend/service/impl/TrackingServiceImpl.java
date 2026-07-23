package com.slp.backend.service.impl;

import com.slp.backend.dto.request.TrackingEventRequest;
import com.slp.backend.dto.response.TrackingEventResponse;
import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.TrackingEvent;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.TrackingEventRepository;
import com.slp.backend.service.TrackingService;
import com.slp.backend.util.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TrackingServiceImpl implements TrackingService {

    private final TrackingEventRepository trackingEventRepository;
    private final ShipmentRepository shipmentRepository;
    private final CurrentUserUtil currentUserUtil;

    @Override
    @Transactional
    public TrackingEventResponse addTrackingEvent(TrackingEventRequest request) {
        Shipment shipment = shipmentRepository.findById(request.getShipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + request.getShipmentId()));

        TrackingEvent event = TrackingEvent.builder()
                .shipment(shipment)
                .status(request.getStatus())
                .location(request.getLocation())
                .description(request.getDescription())
                .build();

        TrackingEvent saved = trackingEventRepository.save(event);

        if (ShipmentStatus.IN_TRANSIT.name().equalsIgnoreCase(request.getStatus())) {
            shipment.setStatus(ShipmentStatus.IN_TRANSIT);
            shipmentRepository.save(shipment);
        } else if (ShipmentStatus.DELIVERED.name().equalsIgnoreCase(request.getStatus())) {
            shipment.setStatus(ShipmentStatus.DELIVERED);
            shipment.setActualDelivery(java.time.LocalDateTime.now());
            shipmentRepository.save(shipment);
        }

        return mapToResponse(saved);
    }

    @Override
    public List<TrackingEventResponse> getTrackingHistory(Long shipmentId) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + shipmentId));

        authorizeTrackingAccess(shipment);

        return trackingEventRepository.findByShipmentIdOrderByTimestampDesc(shipmentId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public Page<TrackingEventResponse> getTrackingHistory(Long shipmentId, Pageable pageable) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + shipmentId));

        authorizeTrackingAccess(shipment);

        return trackingEventRepository.findByShipmentId(shipmentId, pageable)
                .map(this::mapToResponse);
    }

    private void authorizeTrackingAccess(Shipment shipment) {
        var currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in to view tracking history");
        }
    }

    private TrackingEventResponse mapToResponse(TrackingEvent event) {
        return new TrackingEventResponse(
                event.getId(),
                event.getShipment().getId(),
                event.getStatus(),
                event.getLocation(),
                event.getDescription(),
                event.getTimestamp()
        );
    }
}
