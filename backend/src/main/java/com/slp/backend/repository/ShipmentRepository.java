package com.slp.backend.repository;

import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByTrackingNumber(String trackingNumber);
    Page<Shipment> findByStatus(ShipmentStatus status, Pageable pageable);
    Page<Shipment> findByDriverId(Long driverId, Pageable pageable);
    Page<Shipment> findBySenderId(Long senderId, Pageable pageable);
    Page<Shipment> findBySenderIdOrReceiverId(Long senderId, Long receiverId, Pageable pageable);
    Page<Shipment> findBySenderIdOrReceiverIdAndStatus(Long senderId, Long receiverId, ShipmentStatus status, Pageable pageable);
    Page<Shipment> findByDriver_User_Id(Long userId, Pageable pageable);
    Page<Shipment> findByDriver_User_IdAndStatus(Long userId, ShipmentStatus status, Pageable pageable);
    long countByStatus(ShipmentStatus status);
}
