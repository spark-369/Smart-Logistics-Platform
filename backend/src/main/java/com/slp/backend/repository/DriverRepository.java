package com.slp.backend.repository;

import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByLicenseNumber(String licenseNumber);
    Optional<Driver> findByUserId(Long userId);
    boolean existsByLicenseNumber(String licenseNumber);
    Page<Driver> findByStatusAndVehicleIsNull(DriverStatus status, Pageable pageable);
    Page<Driver> findByStatus(DriverStatus status, Pageable pageable);
    long countByStatus(DriverStatus status);
}
