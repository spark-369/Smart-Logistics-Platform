package com.slp.backend.service.impl;

import com.slp.backend.dto.request.ShipmentRequest;
import com.slp.backend.dto.response.ShipmentResponse;
import com.slp.backend.entity.*;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.TrackingEventRepository;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.repository.DriverRepository;
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
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final TrackingEventRepository trackingEventRepository;
    private final CurrentUserUtil currentUserUtil;

    @Override
    @Transactional
    public ShipmentResponse createShipment(ShipmentRequest request) {
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
        if (currentUser != null && !canAccessShipment(currentUser, shipment)) {
            throw new UnauthorizedException("You don't have permission to access this shipment");
        }

        return mapToResponse(shipment);
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
    public ShipmentResponse updateShipmentStatus(Long id, ShipmentStatus status) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + id));

        if (status == ShipmentStatus.ASSIGNED && (shipment.getDriver() == null || shipment.getVehicle() == null)) {
            throw new BadRequestException("Cannot assign shipment without driver and vehicle");
        }

        ShipmentStatus oldStatus = shipment.getStatus();
        shipment.setStatus(status);

        if (status == ShipmentStatus.DELIVERED) {
            shipment.setActualDelivery(java.time.LocalDateTime.now());
        }

        Shipment saved = shipmentRepository.save(shipment);

        String description = "Status changed from " + oldStatus + " to " + status;
        if (status == ShipmentStatus.DELIVERED) {
            description = "Shipment delivered successfully";
        }

        trackingEventRepository.save(TrackingEvent.builder()
                .shipment(saved)
                .status(status.name())
                .location("System")
                .description(description)
                .build());

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteShipment(Long id) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with id: " + id));
        shipmentRepository.delete(shipment);
    }

    @Transactional
    public ShipmentResponse assignDriverAndVehicle(Long shipmentId, Long driverId, Long vehicleId) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found"));

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        shipment.setDriver(driver);
        shipment.setVehicle(vehicle);
        shipment.setStatus(ShipmentStatus.ASSIGNED);

        Shipment saved = shipmentRepository.save(shipment);

        trackingEventRepository.save(TrackingEvent.builder()
                .shipment(saved)
                .status(ShipmentStatus.ASSIGNED.name())
                .location("System")
                .description("Driver " + driver.getUser().getFirstName() + " " + driver.getUser().getLastName() + " and vehicle " + vehicle.getPlateNumber() + " assigned")
                .build());

        return mapToResponse(saved);
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
