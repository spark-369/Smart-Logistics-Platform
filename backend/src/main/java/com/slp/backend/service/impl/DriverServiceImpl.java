package com.slp.backend.service.impl;

import com.slp.backend.dto.response.DriverResponse;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DriverServiceImpl implements DriverService {

    private final DriverRepository driverRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public DriverResponse createDriver(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (user.getRole() != com.slp.backend.entity.Role.DRIVER) {
            throw new BadRequestException("User is not a driver. Role must be DRIVER.");
        }

        if (driverRepository.findByUserId(userId).isPresent()) {
            throw new BadRequestException("Driver profile already exists for this user");
        }

        String licenseNumber = "DL-" + System.currentTimeMillis();

        Driver driver = Driver.builder()
                .licenseNumber(licenseNumber)
                .user(user)
                .status("ACTIVE")
                .build();

        Driver saved = driverRepository.save(driver);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DriverResponse getDriverById(Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + id));
        return mapToResponse(driver);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DriverResponse> getAllDrivers(Pageable pageable) {
        return driverRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DriverResponse> getAvailableDrivers() {
        return driverRepository.findAll().stream()
                .filter(d -> "ACTIVE".equals(d.getStatus()) && d.getVehicle() == null)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DriverResponse> getAvailableDrivers(Pageable pageable) {
        return driverRepository.findByStatusAndVehicleIsNull("ACTIVE", pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public DriverResponse updateDriverStatus(Long id, String status) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + id));

        driver.setStatus(status);
        Driver saved = driverRepository.save(driver);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDriver(Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + id));
        driverRepository.delete(driver);
    }

    private DriverResponse mapToResponse(Driver driver) {
        User user = driver.getUser();
        return new DriverResponse(
                driver.getId(),
                driver.getLicenseNumber(),
                user.getId(),
                user.getFirstName() + " " + user.getLastName(),
                user.getEmail(),
                user.getPhoneNumber(),
                driver.getStatus(),
                driver.getVehicle() != null ? driver.getVehicle().getId() : null,
                driver.getVehicle() != null ? driver.getVehicle().getPlateNumber() : null,
                driver.getCreatedAt(),
                driver.getUpdatedAt()
        );
    }
}
