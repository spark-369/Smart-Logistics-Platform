package com.slp.backend.controller;

import com.slp.backend.dto.request.VehicleRequest;
import com.slp.backend.dto.response.ApiResponse;
import com.slp.backend.dto.response.VehicleResponse;
import com.slp.backend.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vehicles")
@Tag(name = "Vehicles", description = "Vehicle management APIs")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @PostMapping
    @Operation(summary = "Create a new vehicle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VehicleResponse> createVehicle(@Valid @RequestBody VehicleRequest request) {
        VehicleResponse response = vehicleService.createVehicle(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get vehicle by ID")
    public ResponseEntity<VehicleResponse> getVehicleById(@PathVariable Long id) {
        return ResponseEntity.ok(vehicleService.getVehicleById(id));
    }

    @GetMapping
    @Operation(summary = "Get all vehicles")
    public ResponseEntity<Page<VehicleResponse>> getAllVehicles(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(vehicleService.getAllVehicles(pageable));
    }

    @GetMapping("/available")
    @Operation(summary = "Get available vehicles")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ResponseEntity<Page<VehicleResponse>> getAvailableVehicles(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(vehicleService.getAvailableVehicles(pageable));
    }

    @GetMapping("/assignable")
    @Operation(summary = "Get assignable vehicles for shipments")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ResponseEntity<Page<VehicleResponse>> getAssignableVehicles(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(vehicleService.getAssignableVehicles(pageable));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update vehicle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<VehicleResponse> updateVehicle(@PathVariable Long id,
            @Valid @RequestBody VehicleRequest request) {
        return ResponseEntity.ok(vehicleService.updateVehicle(id, request));
    }

    @PostMapping("/{vehicleId}/assign/{driverId}")
    @Operation(summary = "Assign driver to vehicle")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ResponseEntity<VehicleResponse> assignDriver(@PathVariable Long vehicleId, @PathVariable Long driverId) {
        return ResponseEntity.ok(vehicleService.assignDriver(vehicleId, driverId));
    }

    @DeleteMapping("/{vehicleId}/unassign")
    @Operation(summary = "Unassign driver from vehicle")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ResponseEntity<VehicleResponse> unassignDriver(@PathVariable Long vehicleId) {
        return ResponseEntity.ok(vehicleService.unassignDriver(vehicleId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete vehicle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(@PathVariable Long id) {
        vehicleService.deleteVehicle(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Vehicle deleted successfully", null));
    }
}
