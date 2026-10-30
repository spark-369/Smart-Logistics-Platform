package com.slp.backend.service;

import com.slp.backend.dto.response.DriverResponse;
import com.slp.backend.entity.DriverStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DriverService {
    DriverResponse createDriver(Long userId);
    DriverResponse getDriverById(Long id);
    /** Resolves the driver profile owned by the given user id (404 when absent). */
    DriverResponse getDriverByUserId(Long userId);
    Page<DriverResponse> getAllDrivers(Pageable pageable);
    List<DriverResponse> getAvailableDrivers();
    Page<DriverResponse> getAvailableDrivers(Pageable pageable);
    DriverResponse updateDriverStatus(Long id, DriverStatus status);
    void deleteDriver(Long id);
}
