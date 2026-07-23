package com.slp.backend.service;

import com.slp.backend.dto.request.VehicleRequest;
import com.slp.backend.dto.response.VehicleResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VehicleService {
    VehicleResponse createVehicle(VehicleRequest request);
    VehicleResponse getVehicleById(Long id);
    Page<VehicleResponse> getAllVehicles(Pageable pageable);
    List<VehicleResponse> getAvailableVehicles();
    Page<VehicleResponse> getAvailableVehicles(Pageable pageable);
    List<VehicleResponse> getAssignableVehicles();
    Page<VehicleResponse> getAssignableVehicles(Pageable pageable);
    VehicleResponse updateVehicle(Long id, VehicleRequest request);
    VehicleResponse assignDriver(Long vehicleId, Long driverId);
    VehicleResponse unassignDriver(Long vehicleId);
    void deleteVehicle(Long id);
}
