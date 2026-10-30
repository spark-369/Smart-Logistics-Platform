package com.slp.backend.service.impl;

import com.slp.backend.dto.request.VehicleRequest;
import com.slp.backend.dto.response.VehicleResponse;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.entity.Vehicle;
import com.slp.backend.entity.VehicleStatus;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for {@link VehicleServiceImpl}, focusing on the driver/vehicle state machine. */
@ExtendWith(MockitoExtension.class)
@DisplayName("VehicleServiceImpl")
class VehicleServiceImplTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private DriverRepository driverRepository;

    @InjectMocks
    private VehicleServiceImpl vehicleService;

    private Driver driver;
    private Vehicle vehicle;

    @BeforeEach
    void setUp() {
        User user = User.builder().id(7L).firstName("Ali").lastName("Khan").role(Role.DRIVER).enabled(true).build();
        driver = Driver.builder().id(3L).licenseNumber("DL-1").status(DriverStatus.AVAILABLE).user(user).build();
        vehicle = Vehicle.builder()
                .id(9L)
                .plateNumber("ABC-123")
                .model("Volvo FH16")
                .vehicleType("TRUCK")
                .capacity(new BigDecimal("1000.00"))
                .status(VehicleStatus.AVAILABLE)
                .build();
    }

    private VehicleRequest request(String plate, VehicleStatus status, Long driverId) {
        VehicleRequest request = new VehicleRequest();
        request.setPlateNumber(plate);
        request.setModel("Volvo FH16");
        request.setVehicleType("TRUCK");
        request.setCapacity(new BigDecimal("1000.00"));
        request.setStatus(status);
        request.setDriverId(driverId);
        return request;
    }

    @Nested
    @DisplayName("createVehicle")
    class CreateVehicle {

        @Test
        @DisplayName("persists an available vehicle when no driver is supplied")
        void createsAvailableVehicle() {
            when(vehicleRepository.existsByPlateNumber("ABC-123")).thenReturn(false);
            when(vehicleRepository.save(any(Vehicle.class))).thenAnswer(inv -> inv.getArgument(0));

            VehicleResponse response = vehicleService.createVehicle(request("ABC-123", VehicleStatus.AVAILABLE, null));

            assertThat(response.getStatus()).isEqualTo(VehicleStatus.AVAILABLE);
            assertThat(response.getDriverId()).isNull();
        }

        @Test
        @DisplayName("rejects a duplicate plate number")
        void rejectsDuplicatePlate() {
            when(vehicleRepository.existsByPlateNumber("ABC-123")).thenReturn(true);

            assertThatThrownBy(() -> vehicleService.createVehicle(request("ABC-123", VehicleStatus.AVAILABLE, null)))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already exists");

            verify(vehicleRepository, never()).save(any());
        }

        @Test
        @DisplayName("assigning a driver forces IN_USE status and marks the driver ON_TRIP")
        void assigningDriverForcesInUse() {
            when(vehicleRepository.existsByPlateNumber("ABC-123")).thenReturn(false);
            when(driverRepository.findById(3L)).thenReturn(Optional.of(driver));
            when(vehicleRepository.save(any(Vehicle.class))).thenAnswer(inv -> inv.getArgument(0));

            // The caller asks for AVAILABLE, but a vehicle with a driver is by definition in use.
            VehicleResponse response = vehicleService.createVehicle(request("ABC-123", VehicleStatus.AVAILABLE, 3L));

            assertThat(response.getStatus()).isEqualTo(VehicleStatus.IN_USE);
            assertThat(response.getDriverId()).isEqualTo(3L);
            assertThat(driver.getStatus()).isEqualTo(DriverStatus.ON_TRIP);
            assertThat(driver.getVehicle()).isNotNull();
        }

        @Test
        @DisplayName("rejects a vehicle with no driver that is requested as IN_USE")
        void rejectsInUseWithoutDriver() {
            when(vehicleRepository.existsByPlateNumber("ABC-123")).thenReturn(false);

            assertThatThrownBy(() -> vehicleService.createVehicle(request("ABC-123", VehicleStatus.IN_USE, null)))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("IN_USE");
        }

        @Test
        @DisplayName("rejects a driver that already has a vehicle")
        void rejectsDriverWithExistingVehicle() {
            driver.setVehicle(vehicle);
            when(vehicleRepository.existsByPlateNumber("XYZ-999")).thenReturn(false);
            when(driverRepository.findById(3L)).thenReturn(Optional.of(driver));

            assertThatThrownBy(() -> vehicleService.createVehicle(request("XYZ-999", VehicleStatus.AVAILABLE, 3L)))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already assigned");
        }
    }

    @Nested
    @DisplayName("assignDriver / unassignDriver")
    class Assignment {
        @Test
        @DisplayName("assignDriver links both sides and sets IN_USE + ON_TRIP")
        void assignDriverLinksBothSides() {
            when(vehicleRepository.findById(9L)).thenReturn(Optional.of(vehicle));
            when(driverRepository.findById(3L)).thenReturn(Optional.of(driver));
            when(vehicleRepository.save(any(Vehicle.class))).thenAnswer(inv -> inv.getArgument(0));

            VehicleResponse response = vehicleService.assignDriver(9L, 3L);

            assertThat(response.getStatus()).isEqualTo(VehicleStatus.IN_USE);
            assertThat(response.getDriverId()).isEqualTo(3L);
            assertThat(driver.getStatus()).isEqualTo(DriverStatus.ON_TRIP);
        }

        @Test
        @DisplayName("assignDriver refuses a vehicle that already has a driver")
        void assignDriverRejectsOccupiedVehicle() {
            vehicle.setDriver(driver);
            when(vehicleRepository.findById(9L)).thenReturn(Optional.of(vehicle));
            when(driverRepository.findById(3L)).thenReturn(Optional.of(driver));

            assertThatThrownBy(() -> vehicleService.assignDriver(9L, 3L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already has a driver");
        }

        @Test
        @DisplayName("unassignDriver clears the link and frees both records")
        void unassignDriverClearsLink() {
            vehicle.setDriver(driver);
            driver.setVehicle(vehicle);
            driver.setStatus(DriverStatus.ON_TRIP);
            when(vehicleRepository.findById(9L)).thenReturn(Optional.of(vehicle));
            when(vehicleRepository.save(any(Vehicle.class))).thenAnswer(inv -> inv.getArgument(0));

            VehicleResponse response = vehicleService.unassignDriver(9L);

            assertThat(response.getStatus()).isEqualTo(VehicleStatus.AVAILABLE);
            assertThat(response.getDriverId()).isNull();
            assertThat(driver.getStatus()).isEqualTo(DriverStatus.AVAILABLE);
            assertThat(driver.getVehicle()).isNull();
        }

        @Test
        @DisplayName("unassignDriver rejects a vehicle without a driver")
        void unassignDriverRejectsUnassignedVehicle() {
            when(vehicleRepository.findById(9L)).thenReturn(Optional.of(vehicle));

            assertThatThrownBy(() -> vehicleService.unassignDriver(9L))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("no driver");
        }
    }

    @Test
    @DisplayName("deleteVehicle removes an existing vehicle and reports a missing one")
    void deleteVehicle() {
        when(vehicleRepository.findById(9L)).thenReturn(Optional.of(vehicle));

        vehicleService.deleteVehicle(9L);

        ArgumentCaptor<Vehicle> captor = ArgumentCaptor.forClass(Vehicle.class);
        verify(vehicleRepository).delete(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(9L);

        when(vehicleRepository.findById(404L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> vehicleService.deleteVehicle(404L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
