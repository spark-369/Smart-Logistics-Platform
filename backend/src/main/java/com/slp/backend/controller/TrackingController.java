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

    @PostMapping
    @Operation(summary = "Add tracking event")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
    public ResponseEntity<TrackingEventResponse> addTrackingEvent(@Valid @RequestBody TrackingEventRequest request) {
        return new ResponseEntity<>(trackingService.addTrackingEvent(request), HttpStatus.CREATED);
    }

    @GetMapping("/shipment/{shipmentId}")
    @Operation(summary = "Get tracking history for shipment")
    public ResponseEntity<List<TrackingEventResponse>> getTrackingHistory(@PathVariable Long shipmentId) {
        return ResponseEntity.ok(trackingService.getTrackingHistory(shipmentId));
    }

    @GetMapping("/shipment/{shipmentId}/page")
    @Operation(summary = "Get tracking history for shipment (paginated)")
    public ResponseEntity<Page<TrackingEventResponse>> getTrackingHistory(@PathVariable Long shipmentId, Pageable pageable) {
        return ResponseEntity.ok(trackingService.getTrackingHistory(shipmentId, pageable));
    }
}
