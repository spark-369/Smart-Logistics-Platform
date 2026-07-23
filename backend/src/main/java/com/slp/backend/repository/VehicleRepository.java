package com.slp.backend.repository;

import com.slp.backend.entity.Vehicle;
import com.slp.backend.entity.VehicleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByPlateNumber(String plateNumber);
    boolean existsByPlateNumber(String plateNumber);
    List<Vehicle> findByStatus(VehicleStatus status);
    Page<Vehicle> findByStatus(VehicleStatus status, Pageable pageable);
    List<Vehicle> findByStatusIn(List<VehicleStatus> statuses);
    Page<Vehicle> findByStatusIn(List<VehicleStatus> statuses, Pageable pageable);
}
