package com.slp.backend.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.User;
import com.slp.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end authorization tests.
 *
 * <p>These are the regression tests for the two most serious defects found in the codebase:
 * <ol>
 *   <li>{@code @EnableMethodSecurity} was missing, so every {@code @PreAuthorize} annotation on
 *       every controller was silently ignored and any authenticated user could call any endpoint.</li>
 *   <li>{@code UserController} had no method-level rules at all, so any CUSTOMER could list, create
 *       and delete users.</li>
 * </ol>
 *
 * <p>Each assertion below fails loudly if method security is ever disabled again.
 */
@DisplayName("Authorization / RBAC (end-to-end)")
class AuthorizationIT extends AbstractIntegrationTest {

    private static final String USERS = "/api/users";
    private static final String DASHBOARD = "/api/dashboard/stats";

    // -----------------------------------------------------------------------------------------
    // Anonymous access
    // -----------------------------------------------------------------------------------------

    @Test
    @DisplayName("an anonymous request to a protected endpoint returns 401, not 403 or a redirect")
    void anonymousGetsUnauthorized() {
        ResponseEntity<JsonNode> response = getJson(USERS, null);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("a malformed bearer token is rejected with 401 rather than a 500")
    void malformedTokenIsUnauthorized() {
        ResponseEntity<JsonNode> response = getJson(USERS, "this.is.not-a-jwt");

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("a token signed with the wrong key is rejected with 401")
    void forgedTokenIsUnauthorized() {
        String forged = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBzbHAudGVzdCJ9."
                + "ZmFrZXNpZ25hdHVyZWZha2VzaWduYXR1cmVmYWtlc2lnbmF0dXJl";

        ResponseEntity<JsonNode> response = getJson(USERS, forged);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("a token for a deleted user is rejected with 401")
    void tokenForDeletedUserIsUnauthorized() {
        User user = seedUser("deleted@slp.test", Role.ADMIN);
        String token = loginAs(user);
        userRepository.delete(user);

        ResponseEntity<JsonNode> response = getJson(USERS, token);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    // -----------------------------------------------------------------------------------------
    // User administration is ADMIN-only
    // -----------------------------------------------------------------------------------------

    @Test
    @DisplayName("a CUSTOMER cannot list users (403)")
    void customerCannotListUsers() {
        User customer = seedUser("cust-list@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = getJson(USERS, loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("a DISPATCHER cannot list users (403)")
    void dispatcherCannotListUsers() {
        User dispatcher = seedUser("disp-list@slp.test", Role.DISPATCHER);

        assertThat(getJson(USERS, loginAs(dispatcher)).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("a DRIVER cannot list users (403)")
    void driverCannotListUsers() {
        User driver = seedUser("drv-list@slp.test", Role.DRIVER);

        assertThat(getJson(USERS, loginAs(driver)).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("an ADMIN can list users (200)")
    void adminCanListUsers() {
        User admin = seedUser("admin-list@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = getJson(USERS, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("content").isArray()).isTrue();
    }

    @Test
    @DisplayName("a CUSTOMER cannot create a user (403) - the original critical hole")
    void customerCannotCreateUser() {
        User customer = seedUser("cust-create@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson(USERS, """
                {"email": "sneaky-admin@slp.test", "password": "Secret123!",
                 "firstName": "Sneaky", "lastName": "Admin", "role": "ADMIN"}
                """, loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(userRepository.findByEmail("sneaky-admin@slp.test")).isEmpty();
    }

    @Test
    @DisplayName("a CUSTOMER cannot delete a user (403)")
    void customerCannotDeleteUser() {
        User customer = seedUser("cust-del@slp.test", Role.CUSTOMER);
        User victim = seedUser("victim@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = deleteJson(USERS + "/" + victim.getId(), loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(userRepository.findById(victim.getId())).isPresent();
    }

    @Test
    @DisplayName("a DISPATCHER cannot update a user (403)")
    void dispatcherCannotUpdateUser() {
        User dispatcher = seedUser("disp-upd@slp.test", Role.DISPATCHER);
        User target = seedUser("target-upd@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = putJson(USERS + "/" + target.getId(), """
                {"email": "target-upd@slp.test", "firstName": "Changed", "lastName": "Name",
                 "role": "ADMIN", "enabled": true}
                """, loginAs(dispatcher));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(userRepository.findById(target.getId()).orElseThrow().getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    @DisplayName("an ADMIN can create a DISPATCHER through the admin endpoint")
    void adminCanCreatePrivilegedUser() {
        User admin = seedUser("admin-mk@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = postJson(USERS, """
                {"email": "new-dispatcher@slp.test", "password": "Secret123!",
                 "firstName": "New", "lastName": "Dispatcher", "role": "DISPATCHER"}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody().path("role").asText()).isEqualTo("DISPATCHER");

        // And the new account can actually log in with dispatcher authority.
        User created = userRepository.findByEmail("new-dispatcher@slp.test").orElseThrow();
        assertThat(getJson(DASHBOARD, loginAs(created)).getStatusCode().value()).isEqualTo(200);
    }

    @Test
    @DisplayName("an ADMIN cannot delete their own account (400)")
    void adminCannotDeleteSelf() {
        User admin = seedUser("admin-self@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = deleteJson(USERS + "/" + admin.getId(), loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(userRepository.findById(admin.getId())).isPresent();
    }

    // -----------------------------------------------------------------------------------------
    // Dashboard is ADMIN/DISPATCHER only
    // -----------------------------------------------------------------------------------------

    @Test
    @DisplayName("a CUSTOMER cannot read dashboard stats (403)")
    void customerCannotReadDashboard() {
        User customer = seedUser("cust-dash@slp.test", Role.CUSTOMER);

        assertThat(getJson(DASHBOARD, loginAs(customer)).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("a DISPATCHER can read dashboard stats (200)")
    void dispatcherCanReadDashboard() {
        User dispatcher = seedUser("disp-dash@slp.test", Role.DISPATCHER);

        ResponseEntity<JsonNode> response = getJson(DASHBOARD, loginAs(dispatcher));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("totalShipments").isNumber()).isTrue();
        assertThat(response.getBody().path("shipmentsByStatus").isObject()).isTrue();
    }

    // -----------------------------------------------------------------------------------------
    // Drivers and vehicles
    // -----------------------------------------------------------------------------------------

    @Test
    @DisplayName("a CUSTOMER cannot list drivers (403)")
    void customerCannotListDrivers() {
        User customer = seedUser("cust-drivers@slp.test", Role.CUSTOMER);

        assertThat(getJson("/api/drivers", loginAs(customer)).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("a DISPATCHER can list drivers but cannot create a driver profile (403)")
    void dispatcherCanListButNotCreateDrivers() {
        User dispatcher = seedUser("disp-drivers@slp.test", Role.DISPATCHER);
        User driverUser = seedUser("drv-user@slp.test", Role.DRIVER);
        String token = loginAs(dispatcher);

        assertThat(getJson("/api/drivers", token).getStatusCode().value()).isEqualTo(200);
        assertThat(postJson("/api/drivers/" + driverUser.getId(), "", token).getStatusCode().value())
                .isEqualTo(403);
    }

    @Test
    @DisplayName("a DRIVER can read their own profile but not another driver's (403)")
    void driverCanOnlyReadOwnProfile() {
        User driverUser = seedUser("drv-self@slp.test", Role.DRIVER);
        User otherUser = seedUser("drv-other@slp.test", Role.DRIVER);
        Driver ownProfile = driverRepository.save(Driver.builder()
                .licenseNumber("DL-SELF").status(DriverStatus.AVAILABLE).user(driverUser).build());
        Driver otherProfile = driverRepository.save(Driver.builder()
                .licenseNumber("DL-OTHER").status(DriverStatus.AVAILABLE).user(otherUser).build());
        String token = loginAs(driverUser);

        assertThat(getJson("/api/drivers/" + ownProfile.getId(), token).getStatusCode().value()).isEqualTo(200);
        assertThat(getJson("/api/drivers/" + otherProfile.getId(), token).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("a CUSTOMER cannot list vehicles (403)")
    void customerCannotListVehicles() {
        User customer = seedUser("cust-veh@slp.test", Role.CUSTOMER);

        assertThat(getJson("/api/vehicles", loginAs(customer)).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("a DISPATCHER can list vehicles; a DRIVER cannot (200 vs 403)")
    void vehicleListingRoles() {
        User dispatcher = seedUser("veh-disp@slp.test", Role.DISPATCHER);
        User driver = seedUser("veh-driver@slp.test", Role.DRIVER);

        assertThat(getJson("/api/vehicles", loginAs(dispatcher)).getStatusCode().value()).isEqualTo(200);
        assertThat(getJson("/api/vehicles", loginAs(driver)).getStatusCode().value()).isEqualTo(403);
    }

    // -----------------------------------------------------------------------------------------
    // Tracking
    // -----------------------------------------------------------------------------------------

    @Test
    @DisplayName("a DISPATCHER can add tracking events (200/201), not just an ADMIN")
    void dispatcherCanAddTrackingEvent() {
        User dispatcher = seedUser("trk-disp-role@slp.test", Role.DISPATCHER);
        User sender = seedUser("trk-disp-s@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk-disp-r@slp.test", Role.CUSTOMER);
        Shipment shipment = shipmentRepository.save(Shipment.builder()
                .trackingNumber("SLP-DISPTRK").sender(sender).receiver(receiver)
                .status(ShipmentStatus.PENDING)
                .originStreet("1 A").originCity("Karachi").originState("Sindh")
                .originCountry("Pakistan").originZip("74000")
                .destStreet("2 B").destCity("Berlin").destState("Berlin")
                .destCountry("Germany").destZip("10115")
                .build());

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "IN_TRANSIT", "location": "Dubai"}
                """.formatted(shipment.getId()), loginAs(dispatcher));

        // Regression guard: DISPATCHER was missing from @PreAuthorize on POST /api/tracking even
        // though the SPA shows dispatch staff the "Add event" button.
        assertThat(response.getStatusCode().value()).isEqualTo(201);
    }

    @Test
    @DisplayName("an anonymous caller cannot read tracking history (401)")
    void anonymousCannotReadTrackingHistory() {
        User sender = seedUser("trk-anon-s@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk-anon-r@slp.test", Role.CUSTOMER);
        Shipment shipment = shipmentRepository.save(Shipment.builder()
                .trackingNumber("SLP-ANONTRK").sender(sender).receiver(receiver)
                .status(ShipmentStatus.PENDING)
                .originStreet("1 A").originCity("Karachi").originState("Sindh")
                .originCountry("Pakistan").originZip("74000")
                .destStreet("2 B").destCity("Berlin").destState("Berlin")
                .destCountry("Germany").destZip("10115")
                .build());

        assertThat(getJson("/api/tracking/shipment/" + shipment.getId(), null).getStatusCode().value())
                .isEqualTo(401);
    }

    @Test
    @DisplayName("a DISPATCHER cannot create a vehicle, only an ADMIN can (403 vs 201)")
    void onlyAdminCanCreateVehicle() {
        User dispatcher = seedUser("disp-veh@slp.test", Role.DISPATCHER);
        User admin = seedUser("admin-veh@slp.test", Role.ADMIN);
        String payload = """
                {"plateNumber": "NEW-001", "model": "Scania R450", "vehicleType": "TRUCK",
                 "capacity": 9000, "status": "AVAILABLE"}
                """;

        assertThat(postJson("/api/vehicles", payload, loginAs(dispatcher)).getStatusCode().value())
                .isEqualTo(403);
        assertThat(postJson("/api/vehicles", payload, loginAs(admin)).getStatusCode().value())
                .isEqualTo(201);
    }
}
