package com.slp.backend.service;

import com.slp.backend.dto.request.TrackingEventRequest;
import com.slp.backend.dto.response.TrackingEventResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface TrackingService {
    TrackingEventResponse addTrackingEvent(TrackingEventRequest request);
    List<TrackingEventResponse> getTrackingHistory(Long shipmentId);
    Page<TrackingEventResponse> getTrackingHistory(Long shipmentId, Pageable pageable);
}
