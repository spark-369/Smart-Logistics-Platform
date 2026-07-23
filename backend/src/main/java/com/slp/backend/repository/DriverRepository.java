package com.slp.backend.repository;

import com.slp.backend.entity.Driver;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByLicenseNumber(String licenseNumber);
    Optional<Driver> findByUserId(Long userId);
    boolean existsByLicenseNumber(String licenseNumber);
    Page<Driver> findByStatusAndVehicleIsNull(String status, Pageable pageable);
}
