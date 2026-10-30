package com.slp.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.User;
import com.slp.backend.support.AbstractIntegrationTest;
import com.slp.backend.support.TestDataFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end tests for {@code /api/users/**} and {@code /api/dashboard/stats}.
 *
 * <p>These two areas had no end-to-end coverage: user administration is the highest-privilege
 * surface in the platform, and the dashboard is the landing screen for ADMIN/DISPATCHER.
 */
@DisplayName("User administration and dashboard (end-to-end)")
class UserAdminIT extends AbstractIntegrationTest {

    @Autowired
    private TestDataFactory data;

    // -----------------------------------------------------------------------------------------
    // User administration
    // -----------------------------------------------------------------------------------------

    @Test
    @DisplayName("an ADMIN can create a DISPATCHER through /api/users")
    void adminCreatesDispatcher() {
        User admin = seedUser("ua-admin@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = postJson("/api/users", """
                {"email": "new-dispatch@slp.test", "password": "Secret123!", "firstName": "Dee",
                 "lastName": "Spatch", "phoneNumber": "+10000000001", "role": "DISPATCHER"}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody().path("role").asText()).isEqualTo("DISPATCHER");
        assertThat(response.getBody().path("enabled").asBoolean()).isTrue();
        // The password must never appear in the response.
        assertThat(response.getBody().has("password")).isFalse();
        assertThat(userRepository.findByEmail("new-dispatch@slp.test")).isPresent();
    }

    @Test
    @DisplayName("an ADMIN can create a DRIVER, which then becomes eligible for a driver profile")
    void adminCreatesDriver() {
        User admin = seedUser("ua-admin2@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> created = postJson("/api/users", """
                {"email": "new-driver@slp.test", "password": "Secret123!", "firstName": "Dri",
                 "lastName": "Ver", "role": "DRIVER"}
                """, loginAs(admin));

        assertThat(created.getStatusCode().value()).isEqualTo(201);

        User driverUser = userRepository.findByEmail("new-driver@slp.test").orElseThrow();
        ResponseEntity<JsonNode> profile =
                postJson("/api/drivers/" + driverUser.getId(), "", loginAs(admin));

        assertThat(profile.getStatusCode().value()).isEqualTo(201);
    }

    @Test
    @DisplayName("creating a user with a duplicate email is rejected (400)")
    void duplicateEmailRejected() {
        User admin = seedUser("ua-dup-admin@slp.test", Role.ADMIN);
        seedUser("ua-taken@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson("/api/users", """
                {"email": "ua-taken@slp.test", "password": "Secret123!", "firstName": "A",
                 "lastName": "B", "role": "CUSTOMER"}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().path("message").asText()).contains("already registered");
    }

    @Test
    @DisplayName("creating a user with an invalid payload returns field-level errors (400)")
    void createUserValidatesInput() {
        User admin = seedUser("ua-val-admin@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = postJson("/api/users", """
                {"email": "not-an-email", "password": "123", "firstName": "", "lastName": ""}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        JsonNode errors = response.getBody().path("data");
        assertThat(errors.path("email").asText()).contains("valid");
        assertThat(errors.path("password").asText()).contains("6 characters");
    }

    @Test
    @DisplayName("an ADMIN can promote a CUSTOMER to DISPATCHER")
    void adminUpdatesRole() {
        User admin = seedUser("ua-upd-admin@slp.test", Role.ADMIN);
        User customer = seedUser("ua-promote@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = putJson("/api/users/" + customer.getId(), """
                {"email": "ua-promote@slp.test", "firstName": "Pro", "lastName": "Moted",
                 "phoneNumber": "+10000000009", "role": "DISPATCHER", "enabled": true}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("role").asText()).isEqualTo("DISPATCHER");
        assertThat(userRepository.findById(customer.getId()).orElseThrow().getRole())
                .isEqualTo(Role.DISPATCHER);
    }

    @Test
    @DisplayName("updating a user to a taken email is rejected (400)")
    void updateToTakenEmailRejected() {
        User admin = seedUser("ua-upd2-admin@slp.test", Role.ADMIN);
        User first = seedUser("ua-first@slp.test", Role.CUSTOMER);
        seedUser("ua-second@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = putJson("/api/users/" + first.getId(), """
                {"email": "ua-second@slp.test", "firstName": "First", "lastName": "User",
                 "role": "CUSTOMER", "enabled": true}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().path("message").asText()).contains("already in use");
    }

    @Test
    @DisplayName("an ADMIN can disable an account, after which login is rejected with 401")
    void disablingAccountBlocksLogin() {
        User admin = seedUser("ua-dis-admin@slp.test", Role.ADMIN);
        User target = seedUser("ua-disable@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> updated = putJson("/api/users/" + target.getId(), """
                {"email": "ua-disable@slp.test", "firstName": "Dis", "lastName": "Abled",
                 "role": "CUSTOMER", "enabled": false}
                """, loginAs(admin));
        assertThat(updated.getStatusCode().value()).isEqualTo(200);

        ResponseEntity<JsonNode> login = postJson("/api/auth/login", """
                {"email": "ua-disable@slp.test", "password": "%s"}
                """.formatted(DEFAULT_PASSWORD), null);

        // 401 (not 403): the SPA distinguishes "your session/credentials are bad" from
        // "you are authenticated but not allowed", and only the latter routes to /unauthorized.
        assertThat(login.getStatusCode().value()).isEqualTo(401);
        assertThat(login.getBody().path("message").asText()).contains("disabled");
        assertThat(userRepository.findById(target.getId()).orElseThrow().getEnabled()).isFalse();
    }

    @Test
    @DisplayName("an ADMIN can delete another user")
    void adminDeletesAnotherUser() {
        User admin = seedUser("ua-del-admin@slp.test", Role.ADMIN);
        User target = seedUser("ua-delete@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = deleteJson("/api/users/" + target.getId(), loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(userRepository.findById(target.getId())).isEmpty();
    }

    @Test
    @DisplayName("an ADMIN cannot delete their own account (400)")
    void adminCannotDeleteSelf() {
        User admin = seedUser("ua-self-admin@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = deleteJson("/api/users/" + admin.getId(), loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().path("message").asText()).contains("your own account");
        assertThat(userRepository.findById(admin.getId())).isPresent();
    }

    @Test
    @DisplayName("a CUSTOMER can read the user lookup list needed for shipment booking")
    void customerCanUseLookup() {
        User customer = seedUser("ua-lookup@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = getJson("/api/users/lookup", loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().isArray()).isTrue();
        assertThat(response.getBody().get(0).has("password")).isFalse();
    }

    // -----------------------------------------------------------------------------------------
    // Dashboard statistics
    // -----------------------------------------------------------------------------------------

    @Test
    @DisplayName("dashboard stats reflect the persisted data")
    void dashboardStatsReflectData() {
        User admin = seedUser("dash-admin@slp.test", Role.ADMIN);
        User a = seedUser("dash-a@slp.test", Role.CUSTOMER);
        User b = seedUser("dash-b@slp.test", Role.CUSTOMER);
        data.createShipment(a, b, ShipmentStatus.PENDING);
        data.createShipment(a, b, ShipmentStatus.DELIVERED);

        JsonNode stats = getJson("/api/dashboard/stats", loginAs(admin)).getBody();

        assertThat(stats.path("totalShipments").asLong()).isEqualTo(2);
        assertThat(stats.path("pendingShipments").asLong()).isEqualTo(1);
        assertThat(stats.path("deliveredShipments").asLong()).isEqualTo(1);
        assertThat(stats.path("totalUsers").asLong()).isGreaterThanOrEqualTo(3);
        assertThat(stats.path("shipmentsByStatus").path("PENDING").asLong()).isEqualTo(1);
    }

    @Test
    @DisplayName("the status breakdown contains every status key, even at zero")
    void dashboardBreakdownCoversAllStatuses() {
        User admin = seedUser("dash-zero@slp.test", Role.ADMIN);

        JsonNode breakdown =
                getJson("/api/dashboard/stats", loginAs(admin)).getBody().path("shipmentsByStatus");

        assertThat(breakdown.path("PENDING").isNumber()).isTrue();
        assertThat(breakdown.path("ASSIGNED").isNumber()).isTrue();
        assertThat(breakdown.path("IN_TRANSIT").isNumber()).isTrue();
        assertThat(breakdown.path("DELIVERED").isNumber()).isTrue();
        assertThat(breakdown.path("CANCELLED").isNumber()).isTrue();
    }

    @Test
    @DisplayName("a DRIVER cannot read dashboard stats (403)")
    void driverCannotReadDashboard() {
        User driver = seedUser("dash-driver@slp.test", Role.DRIVER);

        assertThat(getJson("/api/dashboard/stats", loginAs(driver)).getStatusCode().value())
                .isEqualTo(403);
    }

    @Test
    @DisplayName("a CUSTOMER cannot read dashboard stats (403)")
    void customerCannotReadDashboard() {
        User customer = seedUser("dash-cust@slp.test", Role.CUSTOMER);

        assertThat(getJson("/api/dashboard/stats", loginAs(customer)).getStatusCode().value())
                .isEqualTo(403);
    }

    @Test
    @DisplayName("an anonymous request to dashboard stats returns 401")
    void anonymousCannotReadDashboard() {
        assertThat(getJson("/api/dashboard/stats", null).getStatusCode().value()).isEqualTo(401);
    }
}
