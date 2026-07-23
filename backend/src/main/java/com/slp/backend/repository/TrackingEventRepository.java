package com.slp.backend.repository;

import com.slp.backend.entity.TrackingEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrackingEventRepository extends JpaRepository<TrackingEvent, Long> {
    List<TrackingEvent> findByShipmentIdOrderByTimestampDesc(Long shipmentId);
    Page<TrackingEvent> findByShipmentId(Long shipmentId, Pageable pageable);
}
