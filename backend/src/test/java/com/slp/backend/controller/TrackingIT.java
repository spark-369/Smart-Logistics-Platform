package com.slp.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.User;
import com.slp.backend.support.AbstractIntegrationTest;
import com.slp.backend.support.TestDataFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/** End-to-end tests for tracking events. */
@DisplayName("Tracking (end-to-end)")
class TrackingIT extends AbstractIntegrationTest {

    @Autowired
    private TestDataFactory data;

    @Test
    @DisplayName("an ADMIN can add a tracking event which is appended to the history")
    void adminAddsTrackingEvent() {
        User admin = seedUser("trk-admin@slp.test", Role.ADMIN);
        User sender = seedUser("trk-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk-recv@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> created = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "IN_TRANSIT", "location": "Dubai",
                 "description": "Cleared customs"}
                """.formatted(shipment.getId()), loginAs(admin));

        assertThat(created.getStatusCode().value()).isEqualTo(201);
        assertThat(created.getBody().path("status").asText()).isEqualTo("IN_TRANSIT");
        assertThat(created.getBody().path("location").asText()).isEqualTo("Dubai");

        // The shipment status must follow the event.
        assertThat(shipmentRepository.findById(shipment.getId()).orElseThrow().getStatus())
                .isEqualTo(ShipmentStatus.IN_TRANSIT);
    }

    @Test
    @DisplayName("a DELIVERED tracking event stamps actualDelivery on the shipment")
    void deliveredEventStampsActualDelivery() {
        User admin = seedUser("trk2-admin@slp.test", Role.ADMIN);
        User sender = seedUser("trk2-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk2-recv@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.IN_TRANSIT);

        ResponseEntity<JsonNode> created = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "DELIVERED", "location": "Berlin"}
                """.formatted(shipment.getId()), loginAs(admin));

        assertThat(created.getStatusCode().value()).isEqualTo(201);
        Shipment reloaded = shipmentRepository.findById(shipment.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(ShipmentStatus.DELIVERED);
        assertThat(reloaded.getActualDelivery()).isNotNull();
    }

    @Test
    @DisplayName("a DRIVER cannot add tracking events to a shipment that is not theirs (403)")
    void driverCannotTrackForeignShipment() {
        User driverUser = seedUser("trk-drv@slp.test", Role.DRIVER);
        data.createDriver(driverUser, DriverStatus.AVAILABLE);
        User sender = seedUser("trk3-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk3-recv@slp.test", Role.CUSTOMER);
        Shipment foreign = data.createShipment(sender, receiver, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "IN_TRANSIT", "location": "Nowhere"}
                """.formatted(foreign.getId()), loginAs(driverUser));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(trackingEventRepository.findByShipmentIdOrderByTimestampDesc(foreign.getId())).isEmpty();
    }

    @Test
    @DisplayName("a DRIVER can add tracking events to their own assigned shipment")
    void driverCanTrackOwnShipment() {
        User driverUser = seedUser("trk-own@slp.test", Role.DRIVER);
        Driver driver = data.createDriver(driverUser, DriverStatus.ON_TRIP);
        User sender = seedUser("trk4-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk4-recv@slp.test", Role.CUSTOMER);
        Shipment mine = data.createShipment(sender, receiver, ShipmentStatus.IN_TRANSIT, driver, null);

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "IN_TRANSIT", "location": "Lahore"}
                """.formatted(mine.getId()), loginAs(driverUser));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
    }

    @Test
    @DisplayName("a CUSTOMER cannot add tracking events (403)")
    void customerCannotAddTrackingEvent() {
        User sender = seedUser("trk5-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk5-recv@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "DELIVERED", "location": "Fake"}
                """.formatted(shipment.getId()), loginAs(sender));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("adding a tracking event validates required fields (400)")
    void addTrackingEventValidates() {
        User admin = seedUser("trk-val@slp.test", Role.ADMIN);

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": 1, "status": "NOT_A_STATUS", "location": ""}
                """, loginAs(admin));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("tracking history is paginated")
    void trackingHistoryIsPaginated() {
        User admin = seedUser("trk-page@slp.test", Role.ADMIN);
        User sender = seedUser("trk6-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("trk6-recv@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.IN_TRANSIT);
        data.addTrackingEvent(shipment, "PENDING", "Karachi");
        data.addTrackingEvent(shipment, "IN_TRANSIT", "Dubai");
        data.addTrackingEvent(shipment, "IN_TRANSIT", "Frankfurt");

        JsonNode page = getJson("/api/tracking/shipment/" + shipment.getId() + "/page?page=0&size=2",
                loginAs(admin)).getBody();

        assertThat(page.path("content")).hasSize(2);
        assertThat(page.path("totalElements").asInt()).isEqualTo(3);
        assertThat(page.path("totalPages").asInt()).isEqualTo(2);
    }

    @Test
    @DisplayName("tracking history for an unknown shipment returns 404")
    void trackingHistoryUnknownShipment() {
        User admin = seedUser("trk-404@slp.test", Role.ADMIN);

        assertThat(getJson("/api/tracking/shipment/999999", loginAs(admin)).getStatusCode().value())
                .isEqualTo(404);
    }
}
