package com.slp.backend.controller;

import com.slp.backend.dto.request.TrackingEventRequest;
import com.slp.backend.dto.response.TrackingEventResponse;
import com.slp.backend.service.TrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tracking")
@Tag(name = "Tracking", description = "Shipment tracking APIs")
public class TrackingController {

    private final TrackingService trackingService;

    public TrackingController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    /**
     * Appends a journey event.
     *
     * <p>DISPATCHER is included alongside ADMIN and DRIVER: dispatch staff are the people who
     * actually record progress when a driver cannot, and the SPA has always shown them the
     * "Add event" control. Omitting the role here produced a confusing 403 that looked like a bug
     * in the UI. The per-shipment ownership rule for DRIVER lives in {@link TrackingService}.
     */
    @PostMapping
    @Operation(summary = "Add tracking event")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER', 'DRIVER')")
    public ResponseEntity<TrackingEventResponse> addTrackingEvent(@Valid @RequestBody TrackingEventRequest request) {
        return new ResponseEntity<>(trackingService.addTrackingEvent(request), HttpStatus.CREATED);
    }

    /**
     * Reading history only requires an authenticated session; the service enforces that a DRIVER
     * can only read shipments assigned to them.
     */
    @GetMapping("/shipment/{shipmentId}")
    @Operation(summary = "Get tracking history for shipment")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TrackingEventResponse>> getTrackingHistory(@PathVariable Long shipmentId) {
        return ResponseEntity.ok(trackingService.getTrackingHistory(shipmentId));
    }

    @GetMapping("/shipment/{shipmentId}/page")
    @Operation(summary = "Get tracking history for shipment (paginated)")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TrackingEventResponse>> getTrackingHistory(@PathVariable Long shipmentId,
                                                                          @org.springframework.data.web.PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(trackingService.getTrackingHistory(shipmentId, pageable));
    }
}

