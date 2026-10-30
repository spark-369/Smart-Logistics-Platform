package com.slp.backend.controller;

import com.slp.backend.dto.request.ShipmentRequest;
import com.slp.backend.dto.response.ApiResponse;
import com.slp.backend.dto.response.PublicTrackingResponse;
import com.slp.backend.dto.response.ShipmentResponse;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.service.ShipmentService;
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

import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@Tag(name = "Shipments", description = "Shipment management APIs")
public class ShipmentController {

    private final ShipmentService shipmentService;

    public ShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    @PostMapping
    @Operation(summary = "Create a new shipment")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DISPATCHER', 'ADMIN')")
    public ResponseEntity<ShipmentResponse> createShipment(@Valid @RequestBody ShipmentRequest request) {
        ShipmentResponse response = shipmentService.createShipment(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get shipment by ID")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ShipmentResponse> getShipmentById(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.getShipmentById(id));
    }

    @GetMapping("/public/tracking/{trackingNumber}")
    @Operation(summary = "Public shipment tracking by tracking number (no authentication, redacted)")
    public ResponseEntity<PublicTrackingResponse> publicTrack(@PathVariable String trackingNumber) {
        return ResponseEntity.ok(shipmentService.getPublicTracking(trackingNumber));
    }

    @GetMapping("/tracking/{trackingNumber}")
    @Operation(summary = "Track shipment by tracking number (authenticated, full details)")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER', 'DRIVER', 'CUSTOMER')")
    public ResponseEntity<ShipmentResponse> trackShipment(@PathVariable String trackingNumber) {
        return ResponseEntity.ok(shipmentService.getShipmentByTrackingNumber(trackingNumber));
    }

    @GetMapping
    @Operation(summary = "Get all shipments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ShipmentResponse>> getAllShipments(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(shipmentService.getAllShipments(pageable));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get shipments by status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ShipmentResponse>> getShipmentsByStatus(@PathVariable ShipmentStatus status, @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(shipmentService.getShipmentsByStatus(status, pageable));
    }

    @GetMapping("/driver/{driverId}")
    @Operation(summary = "Get shipments by driver")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    public ResponseEntity<List<ShipmentResponse>> getShipmentsByDriver(@PathVariable Long driverId) {
        return ResponseEntity.ok(shipmentService.getShipmentsByDriver(driverId));
    }

    /*
     * There is deliberately no PATCH /api/shipments/{id}/status endpoint.
     *
     * A shipment's status is derived exclusively from its journey history: every status change must
     * be recorded as a tracking event through POST /api/tracking. That keeps the tracking timeline
     * and the shipment's own status from ever disagreeing, and makes the event history a complete,
     * auditable record of what happened rather than a partial one with out-of-band edits.
     */

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete shipment")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteShipment(@PathVariable Long id) {
        shipmentService.deleteShipment(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Shipment deleted successfully", null));
    }
}
