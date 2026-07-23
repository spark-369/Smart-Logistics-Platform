package com.slp.backend.service;

import com.slp.backend.dto.response.DriverResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DriverService {
    DriverResponse createDriver(Long userId);
    DriverResponse getDriverById(Long id);
    Page<DriverResponse> getAllDrivers(Pageable pageable);
    List<DriverResponse> getAvailableDrivers();
    Page<DriverResponse> getAvailableDrivers(Pageable pageable);
    DriverResponse updateDriverStatus(Long id, String status);
    void deleteDriver(Long id);
}
