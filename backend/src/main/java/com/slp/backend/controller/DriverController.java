package com.slp.backend.controller;

import com.slp.backend.dto.response.ApiResponse;
import com.slp.backend.dto.response.DriverResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.service.DriverService;
import com.slp.backend.util.CurrentUserUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/drivers")
@Tag(name = "Drivers", description = "Driver management APIs")
public class DriverController {

    private final DriverService driverService;
    private final CurrentUserUtil currentUserUtil;

    public DriverController(DriverService driverService, CurrentUserUtil currentUserUtil) {
        this.driverService = driverService;
        this.currentUserUtil = currentUserUtil;
    }

    @PostMapping("/{userId}")
    @Operation(summary = "Create driver profile for user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DriverResponse> createDriver(@PathVariable Long userId) {
        DriverResponse response = driverService.createDriver(userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get driver by ID")
    public ResponseEntity<DriverResponse> getDriverById(@PathVariable Long id) {
        var driver = driverService.getDriverById(id);
        if (currentUserUtil.hasRole(Role.DRIVER) && !currentUserUtil.getCurrentUser().getId().equals(driver.getUserId())) {
            throw new UnauthorizedException("You can only view your own profile");
        }
        return ResponseEntity.ok(driver);
    }

    @GetMapping
    @Operation(summary = "Get all drivers")
    public ResponseEntity<Page<DriverResponse>> getAllDrivers(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(driverService.getAllDrivers(pageable));
    }

    @GetMapping("/available")
    @Operation(summary = "Get available drivers")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ResponseEntity<Page<DriverResponse>> getAvailableDrivers(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(driverService.getAvailableDrivers(pageable));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update driver status")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ResponseEntity<DriverResponse> updateDriverStatus(@PathVariable Long id, @RequestBody String status) {
        return ResponseEntity.ok(driverService.updateDriverStatus(id, status));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete driver")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteDriver(@PathVariable Long id) {
        driverService.deleteDriver(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Driver deleted successfully", null));
    }
}
