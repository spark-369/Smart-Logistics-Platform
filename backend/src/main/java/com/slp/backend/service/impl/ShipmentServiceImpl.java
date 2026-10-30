package com.slp.backend.service.impl;

import com.slp.backend.dto.request.ShipmentRequest;
import com.slp.backend.dto.response.PublicTrackingResponse;
import com.slp.backend.dto.response.ShipmentResponse;
import com.slp.backend.dto.response.TrackingEventResponse;
import com.slp.backend.entity.*;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.TrackingEventRepository;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.repository.VehicleRepository;
import com.slp.backend.service.ShipmentService;
import com.slp.backend.util.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final TrackingEventRepository trackingEventRepository;
    private final CurrentUserUtil currentUserUtil;

    @Override
    @Transactional
    public ShipmentResponse createShipment(ShipmentRequest request) {
        User currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }

        // Customers may only book shipments they send. Staff book on behalf of anyone.
        if (currentUser.getRole() == Role.CUSTOMER
                && !currentUser.getId().equals(request.getSenderId())) {
            throw new UnauthorizedException("You can only create shipments for yourself as the sender");
        }

        if (request.getSenderId().equals(request.getReceiverId())) {
            throw new BadRequestException("Sender and receiver must be different users");
        }

        User sender = userRepository.findById(request.getSenderId())
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found"));

        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));

        String trackingNumber = "SLP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Shipment.ShipmentBuilder shipmentBuilder = Shipment.builder()
                .trackingNumber(trackingNumber)
                .sender(sender)
                .receiver(receiver)
                .status(ShipmentStatus.PENDING)
                .originStreet(request.getOriginStreet())
                .originCity(request.getOriginCity())
                .originState(request.getOriginState())
                .originCountry(request.getOriginCountry())
                .originZip(request.getOriginZip())
                .destStreet(request.getDestStreet())
                .destCity(request.getDestCity())
                .destState(request.getDestState())
                .destCountry(request.getDestCountry())
                .destZip(request.getDestZip())
                .weight(request.getWeight())
                .description(request.getDescription());

        if (request.getVehicleId() != null) {
            Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + request.getVehicleId()));

            shipmentBuilder.vehicle(vehicle);

            if (vehicle.getDriver() != null) {
                shipmentBuilder.driver(vehicle.getDriver());
                shipmentBuilder.status(ShipmentStatus.ASSIGNED);
            }
        }

        Shipment saved = shipmentRepository.save(shipmentBuilder.build());

        trackingEventRepository.save(TrackingEvent.builder()
                .shipment(saved)
                .status(saved.getStatus().name())
                .location("System")
                .description("Shipment created with tracking number " + saved.getTrackingNumber())
                .build());

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ShipmentResponse getShipmentById(Long id) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + id));

        User currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }

        if (!canAccessShipment(currentUser, shipment)) {
            throw new UnauthorizedException("You don't have permission to access this shipment");
        }

        return mapToResponse(shipment);
    }

    @Override
    @Transactional(readOnly = true)
    public ShipmentResponse getShipmentByTrackingNumber(String trackingNumber) {
        Shipment shipment = shipmentRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with tracking number: " + trackingNumber));

        User currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }
        if (!canAccessShipment(currentUser, shipment)) {
            throw new UnauthorizedException("You don't have permission to access this shipment");
        }

        return mapToResponse(shipment);
    }

    /**
     * Anonymous, redacted tracking lookup used by the public {@code /track/:trackingNumber} page.
     * Never exposes customer PII or internal identifiers.
     */
    @Override
    @Transactional(readOnly = true)
    public PublicTrackingResponse getPublicTracking(String trackingNumber) {
        Shipment shipment = shipmentRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with tracking number: " + trackingNumber));

        List<TrackingEventResponse> events = trackingEventRepository
                .findByShipmentIdOrderByTimestampDesc(shipment.getId())
                .stream()
                .map(event -> new TrackingEventResponse(
                        event.getId(),
                        event.getShipment().getId(),
                        event.getStatus(),
                        event.getLocation(),
                        event.getDescription(),
                        event.getTimestamp()))
                .toList();

        return new PublicTrackingResponse(
                shipment.getTrackingNumber(),
                shipment.getStatus(),
                shipment.getOriginCity(),
                shipment.getOriginCountry(),
                shipment.getDestCity(),
                shipment.getDestCountry(),
                shipment.getEstimatedDelivery(),
                shipment.getActualDelivery(),
                shipment.getCreatedAt(),
                events
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShipmentResponse> getAllShipments(Pageable pageable) {
        User currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }

        if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.DISPATCHER) {
            return shipmentRepository.findAll(pageable).map(this::mapToResponse);
        }

        if (currentUser.getRole() == Role.CUSTOMER) {
            return shipmentRepository.findBySenderIdOrReceiverId(currentUser.getId(), currentUser.getId(), pageable)
                    .map(this::mapToResponse);
        }

        if (currentUser.getRole() == Role.DRIVER) {
            return shipmentRepository.findByDriver_User_Id(currentUser.getId(), pageable)
                    .map(this::mapToResponse);
        }

        throw new UnauthorizedException("You don't have permission to view shipments");
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ShipmentResponse> getShipmentsByStatus(ShipmentStatus status, Pageable pageable) {
        User currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }

        if (currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.DISPATCHER) {
            return shipmentRepository.findByStatus(status, pageable).map(this::mapToResponse);
        }

        if (currentUser.getRole() == Role.CUSTOMER) {
            return shipmentRepository.findBySenderIdOrReceiverIdAndStatus(
                    currentUser.getId(), currentUser.getId(), status, pageable)
                    .map(this::mapToResponse);
        }

        if (currentUser.getRole() == Role.DRIVER) {
            return shipmentRepository.findByDriver_User_IdAndStatus(currentUser.getId(), status, pageable)
                    .map(this::mapToResponse);
        }

        throw new UnauthorizedException("You don't have permission to view shipments");
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipmentResponse> getShipmentsByDriver(Long driverId) {
        User currentUser = currentUserUtil.getCurrentUser();
        if (currentUser == null) {
            throw new UnauthorizedException("You must be logged in");
        }

        if (currentUser.getRole() != Role.ADMIN && currentUser.getRole() != Role.DISPATCHER) {
            throw new UnauthorizedException("You don't have permission to view driver shipments");
        }

        return shipmentRepository.findByDriverId(driverId, Pageable.unpaged()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public void deleteShipment(Long id) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + id));
        shipmentRepository.delete(shipment);
    }

    private boolean canAccessShipment(User user, Shipment shipment) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.DISPATCHER) {
            return true;
        }
        if (user.getRole() == Role.CUSTOMER) {
            return shipment.getSender().getId().equals(user.getId()) ||
                   shipment.getReceiver().getId().equals(user.getId());
        }
        if (user.getRole() == Role.DRIVER && shipment.getDriver() != null) {
            return shipment.getDriver().getUser().getId().equals(user.getId());
        }
        return false;
    }

    private ShipmentResponse mapToResponse(Shipment shipment) {
        Driver vehicleDriver = shipment.getVehicle() != null ? shipment.getVehicle().getDriver() : null;

        return new ShipmentResponse(
                shipment.getId(),
                shipment.getTrackingNumber(),
                shipment.getSender().getId(),
                shipment.getSender().getFirstName() + " " + shipment.getSender().getLastName(),
                shipment.getReceiver().getId(),
                shipment.getReceiver().getFirstName() + " " + shipment.getReceiver().getLastName(),
                shipment.getDriver() != null ? shipment.getDriver().getId() : null,
                shipment.getDriver() != null ? shipment.getDriver().getUser().getFirstName() + " " + shipment.getDriver().getUser().getLastName() : null,
                shipment.getVehicle() != null ? shipment.getVehicle().getId() : null,
                shipment.getVehicle() != null ? shipment.getVehicle().getPlateNumber() : null,
                vehicleDriver != null ? vehicleDriver.getId() : null,
                vehicleDriver != null ? vehicleDriver.getUser().getFirstName() + " " + vehicleDriver.getUser().getLastName() : null,
                shipment.getStatus(),
                shipment.getOriginStreet(),
                shipment.getOriginCity(),
                shipment.getOriginState(),
                shipment.getOriginCountry(),
                shipment.getOriginZip(),
                shipment.getDestStreet(),
                shipment.getDestCity(),
                shipment.getDestState(),
                shipment.getDestCountry(),
                shipment.getDestZip(),
                shipment.getWeight(),
                shipment.getDescription(),
                shipment.getEstimatedDelivery(),
                shipment.getActualDelivery(),
                shipment.getCreatedAt(),
                shipment.getUpdatedAt()
        );
    }
}
