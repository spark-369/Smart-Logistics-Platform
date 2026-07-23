package com.slp.backend.service.impl;

import com.slp.backend.dto.request.VehicleRequest;
import com.slp.backend.dto.response.VehicleResponse;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.Vehicle;
import com.slp.backend.entity.VehicleStatus;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.VehicleRepository;
import com.slp.backend.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;

    @Override
    @Transactional
    public VehicleResponse createVehicle(VehicleRequest request) {
        if (vehicleRepository.existsByPlateNumber(request.getPlateNumber())) {
            throw new BadRequestException("Vehicle with plate number already exists");
        }

        Vehicle vehicle = Vehicle.builder()
                .plateNumber(request.getPlateNumber())
                .model(request.getModel())
                .vehicleType(request.getVehicleType())
                .capacity(request.getCapacity())
                .build();

        if (request.getDriverId() != null) {
            Driver driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + request.getDriverId()));

            if (driver.getVehicle() != null) {
                throw new BadRequestException("Driver already assigned to a vehicle");
            }

            vehicle.setStatus(VehicleStatus.IN_USE);
            driver.setStatus("ACTIVE");
            driver.setVehicle(vehicle);
            vehicle.setDriver(driver);
            driverRepository.save(driver);
        } else {
            vehicle.setStatus(request.getStatus() != null ? request.getStatus() : VehicleStatus.AVAILABLE);
        }

        Vehicle savedVehicle = vehicleRepository.save(vehicle);
        return mapToResponse(savedVehicle);
    }

    @Override
    @Transactional(readOnly = true)
    public VehicleResponse getVehicleById(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
        return mapToResponse(vehicle);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VehicleResponse> getAllVehicles(Pageable pageable) {
        return vehicleRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VehicleResponse> getAssignableVehicles() {
        List<VehicleStatus> assignableStatuses = Arrays.asList(VehicleStatus.AVAILABLE, VehicleStatus.IN_USE);
        return vehicleRepository.findByStatusIn(assignableStatuses).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VehicleResponse> getAssignableVehicles(Pageable pageable) {
        List<VehicleStatus> assignableStatuses = Arrays.asList(VehicleStatus.AVAILABLE, VehicleStatus.IN_USE);
        return vehicleRepository.findByStatusIn(assignableStatuses, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VehicleResponse> getAvailableVehicles() {
        return vehicleRepository.findByStatus(VehicleStatus.AVAILABLE).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VehicleResponse> getAvailableVehicles(Pageable pageable) {
        return vehicleRepository.findByStatus(VehicleStatus.AVAILABLE, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public VehicleResponse updateVehicle(Long id, VehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));

        if (request.getPlateNumber() != null && !request.getPlateNumber().equals(vehicle.getPlateNumber())) {
            if (vehicleRepository.existsByPlateNumber(request.getPlateNumber())) {
                throw new BadRequestException("Vehicle with plate number already exists");
            }
            vehicle.setPlateNumber(request.getPlateNumber());
        }

        if (request.getModel() != null) {
            vehicle.setModel(request.getModel());
        }
        if (request.getVehicleType() != null) {
            vehicle.setVehicleType(request.getVehicleType());
        }
        if (request.getCapacity() != null) {
            vehicle.setCapacity(request.getCapacity());
        }
        if (request.getStatus() != null) {
            vehicle.setStatus(request.getStatus());
        }

        Vehicle saved = vehicleRepository.save(vehicle);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public VehicleResponse assignDriver(Long vehicleId, Long driverId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        if (driver.getVehicle() != null) {
            throw new BadRequestException("Driver already assigned to a vehicle");
        }

        if (vehicle.getDriver() != null) {
            throw new BadRequestException("Vehicle already has a driver assigned");
        }

        driver.setStatus("ACTIVE");
        driverRepository.save(driver);

        vehicle.setDriver(driver);
        vehicle.setStatus(VehicleStatus.IN_USE);
        Vehicle saved = vehicleRepository.save(vehicle);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public VehicleResponse unassignDriver(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (vehicle.getDriver() == null) {
            throw new BadRequestException("Vehicle has no driver assigned");
        }

        Driver driver = vehicle.getDriver();
        driver.setStatus("ACTIVE");
        driver.setVehicle(null);
        driverRepository.save(driver);

        vehicle.setDriver(null);
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        Vehicle saved = vehicleRepository.save(vehicle);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteVehicle(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
        vehicleRepository.delete(vehicle);
    }

    private VehicleResponse mapToResponse(Vehicle vehicle) {
        return new VehicleResponse(
                vehicle.getId(),
                vehicle.getPlateNumber(),
                vehicle.getModel(),
                vehicle.getVehicleType(),
                vehicle.getStatus(),
                vehicle.getCapacity(),
                vehicle.getDriver() != null ? vehicle.getDriver().getId() : null,
                vehicle.getDriver() != null ? vehicle.getDriver().getUser().getFirstName() + " " + vehicle.getDriver().getUser().getLastName() : null,
                vehicle.getCreatedAt(),
                vehicle.getUpdatedAt()
        );
    }
}
