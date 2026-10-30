package com.slp.backend.service.impl;

import com.slp.backend.dto.response.DriverResponse;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.entity.Vehicle;
import com.slp.backend.entity.VehicleStatus;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Unit tests for {@link DriverServiceImpl}. */
@ExtendWith(MockitoExtension.class)
@DisplayName("DriverServiceImpl")
class DriverServiceImplTest {

    @Mock
    private DriverRepository driverRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DriverServiceImpl driverService;

    private User driverUser;
    private Driver driver;

    @BeforeEach
    void setUp() {
        driverUser = User.builder()
                .id(11L)
                .email("driver@slp.test")
                .firstName("Sara")
                .lastName("Ahmed")
                .phoneNumber("+11111111111")
                .role(Role.DRIVER)
                .enabled(true)
                .build();
        driver = Driver.builder()
                .id(5L)
                .licenseNumber("DL-1000")
                .status(DriverStatus.AVAILABLE)
                .user(driverUser)
                .build();
    }

    private Vehicle assignedVehicle() {
        return Vehicle.builder()
                .id(2L).plateNumber("XYZ-1").model("MAN TGX").vehicleType("TRUCK")
                .capacity(new BigDecimal("5000.00")).status(VehicleStatus.IN_USE).build();
    }

    @Nested
    @DisplayName("createDriver")
    class CreateDriver {

        @Test
        @DisplayName("creates a driver profile in AVAILABLE state for a DRIVER-role user")
        void createsDriverForDriverRole() {
            when(userRepository.findById(11L)).thenReturn(Optional.of(driverUser));
            when(driverRepository.findByUserId(11L)).thenReturn(Optional.empty());
            when(driverRepository.save(any(Driver.class))).thenAnswer(inv -> {
                Driver toSave = inv.getArgument(0);
                toSave.setId(5L);
                return toSave;
            });

            DriverResponse response = driverService.createDriver(11L);

            assertThat(response.getId()).isEqualTo(5L);
            assertThat(response.getStatus()).isEqualTo(DriverStatus.AVAILABLE);
            assertThat(response.getLicenseNumber()).startsWith("DL-");
            assertThat(response.getUserId()).isEqualTo(11L);
            assertThat(response.getUserName()).isEqualTo("Sara Ahmed");
        }

        @Test
        @DisplayName("rejects a user that is not a DRIVER")
        void rejectsNonDriverRole() {
            driverUser.setRole(Role.CUSTOMER);
            when(userRepository.findById(11L)).thenReturn(Optional.of(driverUser));

            assertThatThrownBy(() -> driverService.createDriver(11L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Role must be DRIVER");
        }

        @Test
        @DisplayName("rejects a second profile for the same user")
        void rejectsDuplicateProfile() {
            when(userRepository.findById(11L)).thenReturn(Optional.of(driverUser));
            when(driverRepository.findByUserId(11L)).thenReturn(Optional.of(driver));

            assertThatThrownBy(() -> driverService.createDriver(11L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already exists");
        }

        @Test
        @DisplayName("rejects an unknown user id")
        void rejectsUnknownUser() {
            when(userRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> driverService.createDriver(404L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updateDriverStatus")
    class UpdateStatus {

        @Test
        @DisplayName("updates the status of an unassigned driver")
        void updatesStatus() {
            when(driverRepository.findById(5L)).thenReturn(Optional.of(driver));
            when(driverRepository.save(any(Driver.class))).thenAnswer(inv -> inv.getArgument(0));

            DriverResponse response = driverService.updateDriverStatus(5L, DriverStatus.INACTIVE);

            assertThat(response.getStatus()).isEqualTo(DriverStatus.INACTIVE);
        }

        @Test
        @DisplayName("refuses to deactivate a driver that is still attached to a vehicle")
        void refusesDeactivatingAssignedDriver() {
            driver.setVehicle(assignedVehicle());
            when(driverRepository.findById(5L)).thenReturn(Optional.of(driver));

            assertThatThrownBy(() -> driverService.updateDriverStatus(5L, DriverStatus.INACTIVE))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Unassign the driver");
        }

        @Test
        @DisplayName("allows marking an assigned driver as ON_TRIP")
        void allowsOnTripWhileAssigned() {
            driver.setVehicle(assignedVehicle());
            when(driverRepository.findById(5L)).thenReturn(Optional.of(driver));
            when(driverRepository.save(any(Driver.class))).thenAnswer(inv -> inv.getArgument(0));

            DriverResponse response = driverService.updateDriverStatus(5L, DriverStatus.ON_TRIP);

            assertThat(response.getStatus()).isEqualTo(DriverStatus.ON_TRIP);
        }

        @Test
        @DisplayName("reports a missing driver")
        void unknownDriver() {
            when(driverRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> driverService.updateDriverStatus(404L, DriverStatus.AVAILABLE))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("queries")
    class Queries {

        @Test
        @DisplayName("getAvailableDrivers pages only AVAILABLE drivers without a vehicle")
        void availableDriversUsesRepositoryQuery() {
            Pageable pageable = PageRequest.of(0, 20);
            when(driverRepository.findByStatusAndVehicleIsNull(DriverStatus.AVAILABLE, pageable))
                    .thenReturn(new PageImpl<>(List.of(driver)));

            Page<DriverResponse> page = driverService.getAvailableDrivers(pageable);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().get(0).getStatus()).isEqualTo(DriverStatus.AVAILABLE);
        }

        @Test
        @DisplayName("getAllDrivers maps every entity to a response")
        void getAllDriversMapsEntities() {
            Pageable pageable = PageRequest.of(0, 20);
            when(driverRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(driver), pageable, 1));

            Page<DriverResponse> page = driverService.getAllDrivers(pageable);

            assertThat(page.getTotalElements()).isEqualTo(1);
            assertThat(page.getContent().get(0).getEmail()).isEqualTo("driver@slp.test");
        }

        @Test
        @DisplayName("getAvailableDrivers() list variant excludes assigned drivers")
        void availableDriverListExcludesAssigned() {
            Driver assigned = Driver.builder().id(6L).licenseNumber("DL-2")
                    .status(DriverStatus.ON_TRIP).user(driverUser)
                    .vehicle(assignedVehicle())
                    .build();
            when(driverRepository.findAll()).thenReturn(List.of(driver, assigned));

            List<DriverResponse> available = driverService.getAvailableDrivers();

            assertThat(available).hasSize(1);
            assertThat(available.get(0).getId()).isEqualTo(5L);
        }

        @Test
        @DisplayName("getDriverById returns the mapped driver and 404s when absent")
        void getDriverById() {
            when(driverRepository.findById(5L)).thenReturn(Optional.of(driver));

            DriverResponse response = driverService.getDriverById(5L);

            assertThat(response.getLicenseNumber()).isEqualTo("DL-1000");
            assertThat(response.getVehicleId()).isNull();
            assertThat(response.getVehiclePlate()).isNull();

            when(driverRepository.findById(404L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> driverService.getDriverById(404L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("getDriverByUserId resolves the profile owned by the user and 404s when absent")
        void getDriverByUserId() {
            when(driverRepository.findByUserId(11L)).thenReturn(Optional.of(driver));

            DriverResponse response = driverService.getDriverByUserId(11L);

            // DriverResponse.userId is projected from driver.user.id, so the stubbed lookup key
            // and the asserted id must both be the fixture user's id (11L).
            assertThat(response.getUserId()).isEqualTo(11L);
            assertThat(response.getLicenseNumber()).isEqualTo("DL-1000");

            when(driverRepository.findByUserId(404L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> driverService.getDriverByUserId(404L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("404");
        }
    }
}
