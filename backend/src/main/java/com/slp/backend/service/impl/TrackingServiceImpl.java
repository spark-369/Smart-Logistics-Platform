package com.slp.backend.service.impl;

import com.slp.backend.dto.request.TrackingEventRequest;
import com.slp.backend.dto.response.TrackingEventResponse;
import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.TrackingEvent;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
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

        // A driver may only log progress for shipments assigned to them; staff may log for any.
        User currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }
        if (currentUser.getRole() == Role.DRIVER) {
            boolean assignedToDriver = shipment.getDriver() != null
                    && shipment.getDriver().getUser().getId().equals(currentUser.getId());
            if (!assignedToDriver) {
                throw new UnauthorizedException("You can only add tracking events to shipments assigned to you");
            }
        }

        // Validate and apply the transition *before* writing anything, so a rejected status (for
        // example ASSIGNED without a driver and vehicle) leaves no partial event behind rather than
        // depending on transaction rollback.
        applyStatusFromEvent(shipment, request.getStatus());

        TrackingEvent event = TrackingEvent.builder()
                .shipment(shipment)
                .status(request.getStatus().name())
                .location(request.getLocation())
                .description(request.getDescription())
                .build();

        return mapToResponse(trackingEventRepository.save(event));
    }

    /**
     * Synchronises the shipment's own status with a newly recorded journey event.
     *
     * <p>This is the only place a shipment status changes: there is no separate status-update
     * endpoint, so the tracking history is by construction the authoritative record of the
     * shipment's progress and the two can never disagree.
     *
     * <p>Rules:
     * <ul>
     *   <li>{@code ASSIGNED} is rejected unless both a driver and a vehicle are attached — the
     *       shipment is not actually assigned without them.</li>
     *   <li>{@code DELIVERED} stamps {@code actualDelivery}.</li>
     *   <li>Any other status (including {@code PENDING} and {@code CANCELLED}) is applied as-is,
     *       because the event is the audit record of that transition.</li>
     * </ul>
     */
    private void applyStatusFromEvent(Shipment shipment, ShipmentStatus status) {
        if (status == ShipmentStatus.ASSIGNED
                && (shipment.getDriver() == null || shipment.getVehicle() == null)) {
            throw new BadRequestException("Cannot assign shipment without driver and vehicle");
        }

        shipment.setStatus(status);

        if (status == ShipmentStatus.DELIVERED) {
            shipment.setActualDelivery(java.time.LocalDateTime.now());
        }

        shipmentRepository.save(shipment);
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
