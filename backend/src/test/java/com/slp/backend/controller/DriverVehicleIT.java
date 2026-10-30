package com.slp.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.entity.Vehicle;
import com.slp.backend.entity.VehicleStatus;
import com.slp.backend.support.AbstractIntegrationTest;
import com.slp.backend.support.TestDataFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end tests for driver and vehicle management.
 *
 * <p>Includes the regression test for {@code PATCH /api/drivers/{id}/status}: the controller used
 * to bind the raw request body to a {@code String} while the SPA sent {@code {"status": "..."}},
 * so every status change failed with HTTP 400. The driver status was also a free-form string whose
 * values ("ACTIVE") never matched the values the UI expected ("AVAILABLE").
 */
@DisplayName("Driver and vehicle management (end-to-end)")
class DriverVehicleIT extends AbstractIntegrationTest {

    @Autowired
    private TestDataFactory data;

    @Test
    @DisplayName("an ADMIN creates a driver profile that starts AVAILABLE")
    void adminCreatesDriverProfile() {
        User admin = seedUser("dv-admin@slp.test", Role.ADMIN);
        User driverUser = seedUser("dv-driver@slp.test", Role.DRIVER);

        ResponseEntity<JsonNode> response =
                postJson("/api/drivers/" + driverUser.getId(), "", loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody().path("status").asText()).isEqualTo("AVAILABLE");
        assertThat(response.getBody().path("userId").asLong()).isEqualTo(driverUser.getId());
    }

    @Test
    @DisplayName("GET /api/drivers/me resolves the caller's own profile")
    void driverResolvesOwnProfile() {
        User driverUser = seedUser("dv-me@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser, DriverStatus.AVAILABLE);

        ResponseEntity<JsonNode> response = getJson("/api/drivers/me", loginAs(driverUser));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("id").asLong()).isEqualTo(driver.getId());
        assertThat(response.getBody().path("userId").asLong()).isEqualTo(driverUser.getId());
    }

    @Test
    @DisplayName("GET /api/drivers/me returns 404 when the caller has no driver profile")
    void driverWithoutProfileGets404() {
        User driverUser = seedUser("dv-noprofile@slp.test", Role.DRIVER);

        ResponseEntity<JsonNode> response = getJson("/api/drivers/me", loginAs(driverUser));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("GET /api/drivers/me is unavailable to a CUSTOMER (403)")
    void customerCannotResolveDriverProfile() {
        User customer = seedUser("dv-me-cust@slp.test", Role.CUSTOMER);

        assertThat(getJson("/api/drivers/me", loginAs(customer)).getStatusCode().value())
                .isEqualTo(403);
    }

    @Test
    @DisplayName("GET /api/drivers/me requires authentication (401 anonymous)")
    void anonymousCannotResolveDriverProfile() {
        assertThat(getJson("/api/drivers/me", null).getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("PATCH /api/drivers/{id}/status accepts a JSON body and returns the new status")
    void patchDriverStatusAcceptsJsonBody() {
        User admin = seedUser("dvs-admin@slp.test", Role.ADMIN);
        User driverUser = seedUser("dvs-driver@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser, DriverStatus.AVAILABLE);

        ResponseEntity<JsonNode> response = patchJson(
                "/api/drivers/" + driver.getId() + "/status", """
                        {"status": "INACTIVE"}
                        """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("status").asText()).isEqualTo("INACTIVE");
        assertThat(driverRepository.findById(driver.getId()).orElseThrow().getStatus())
                .isEqualTo(DriverStatus.INACTIVE);
    }

    @Test
    @DisplayName("PATCH /api/drivers/{id}/status rejects an unknown status value (400)")
    void patchDriverStatusRejectsUnknownValue() {
        User admin = seedUser("dvu-admin@slp.test", Role.ADMIN);
        User driverUser = seedUser("dvu-driver@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser);

        ResponseEntity<JsonNode> response = patchJson(
                "/api/drivers/" + driver.getId() + "/status", """
                        {"status": "ACTIVE"}
                        """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("PATCH /api/drivers/{id}/status requires the status field (400)")
    void patchDriverStatusRequiresField() {
        User admin = seedUser("dvr-admin@slp.test", Role.ADMIN);
        User driverUser = seedUser("dvr-driver@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser);

        ResponseEntity<JsonNode> response = patchJson(
                "/api/drivers/" + driver.getId() + "/status", "{}", loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("a DISPATCHER can list available drivers but not assigned ones")
    void availableDriversExcludesAssigned() {
        User dispatcher = seedUser("avail-disp@slp.test", Role.DISPATCHER);
        User freeUser = seedUser("avail-free@slp.test", Role.DRIVER);
        User busyUser = seedUser("avail-busy@slp.test", Role.DRIVER);
        Driver free = data.createDriver(freeUser, DriverStatus.AVAILABLE);
        Driver busy = data.createDriver(busyUser, DriverStatus.ON_TRIP);
        Vehicle busyVehicle = data.createVehicle("BUSY-1", VehicleStatus.IN_USE, busy);
        busy.setVehicle(busyVehicle);
        driverRepository.save(busy);

        JsonNode content = getJson("/api/drivers/available", loginAs(dispatcher)).getBody().path("content");

        assertThat(content).hasSize(1);
        assertThat(content.get(0).path("id").asLong()).isEqualTo(free.getId());
    }

    @Test
    @DisplayName("a CUSTOMER cannot list the available driver pool (403)")
    void customerCannotListAvailableDrivers() {
        User customer = seedUser("cust-avail@slp.test", Role.CUSTOMER);

        assertThat(getJson("/api/drivers/available", loginAs(customer)).getStatusCode().value())
                .isEqualTo(403);
    }

    @Test
    @DisplayName("assigning a driver to a vehicle flips both records to in-use states")
    void assigningDriverFlipsBothRecords() {
        User admin = seedUser("asg-admin@slp.test", Role.ADMIN);
        User driverUser = seedUser("asg-driver@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser, DriverStatus.AVAILABLE);
        Vehicle vehicle = data.createVehicle("ASG-1");

        ResponseEntity<JsonNode> response = postJson(
                "/api/vehicles/" + vehicle.getId() + "/assign/" + driver.getId(), "", loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("status").asText()).isEqualTo("IN_USE");
        assertThat(response.getBody().path("driverId").asLong()).isEqualTo(driver.getId());
        assertThat(driverRepository.findById(driver.getId()).orElseThrow().getStatus())
                .isEqualTo(DriverStatus.ON_TRIP);
    }

    @Test
    @DisplayName("unassigning frees the vehicle and the driver again")
    void unassigningFreesBoth() {
        User admin = seedUser("una-admin@slp.test", Role.ADMIN);
        User driverUser = seedUser("una-driver@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser, DriverStatus.ON_TRIP);
        Vehicle vehicle = data.createVehicle("UNA-1", VehicleStatus.IN_USE, driver);
        driver.setVehicle(vehicle);
        driverRepository.save(driver);

        ResponseEntity<JsonNode> response =
                deleteJson("/api/vehicles/" + vehicle.getId() + "/unassign", loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("status").asText()).isEqualTo("AVAILABLE");
        assertThat(response.getBody().path("driverId").isNull()).isTrue();
        assertThat(driverRepository.findById(driver.getId()).orElseThrow().getStatus())
                .isEqualTo(DriverStatus.AVAILABLE);
    }

    @Test
    @DisplayName("creating a vehicle with a driver forces IN_USE (the requested status is ignored)")
    void createVehicleWithDriverForcesInUse() {
        User admin = seedUser("cvd-admin@slp.test", Role.ADMIN);
        User driverUser = seedUser("cvd-driver@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser, DriverStatus.AVAILABLE);

        ResponseEntity<JsonNode> response = postJson("/api/vehicles", """
                {"plateNumber": "CVD-1", "model": "Volvo FH", "vehicleType": "TRUCK",
                 "capacity": 8000, "status": "AVAILABLE", "driverId": %d}
                """.formatted(driver.getId()), loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody().path("status").asText()).isEqualTo("IN_USE");
        assertThat(response.getBody().path("driverId").asLong()).isEqualTo(driver.getId());
    }

    @Test
    @DisplayName("a vehicle without a driver cannot be created as IN_USE (400)")
    void vehicleWithoutDriverCannotBeInUse() {
        User admin = seedUser("no-inuse@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = postJson("/api/vehicles", """
                {"plateNumber": "NOIN-1", "model": "Volvo FH", "vehicleType": "TRUCK",
                 "capacity": 8000, "status": "IN_USE"}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("a duplicate plate number is rejected (400)")
    void duplicatePlateRejected() {
        User admin = seedUser("dup-admin@slp.test", Role.ADMIN);
        data.createVehicle("DUP-1");

        ResponseEntity<JsonNode> response = postJson("/api/vehicles", """
                {"plateNumber": "DUP-1", "model": "Volvo FH", "vehicleType": "TRUCK",
                 "capacity": 8000, "status": "AVAILABLE"}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().path("message").asText()).contains("already exists");
    }
}
