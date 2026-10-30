package com.slp.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
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

/**
 * End-to-end tests for anonymous public tracking.
 *
 * <p>Regression coverage for a defect that made the public {@code /track/:trackingNumber} page
 * completely unusable: the tracking endpoint required authentication while the page is rendered
 * outside the authenticated layout, so every lookup returned 401 and the SPA bounced the visitor
 * to the login screen.
 */
@DisplayName("Public tracking (end-to-end)")
class PublicTrackingIT extends AbstractIntegrationTest {

    @Autowired
    private TestDataFactory data;

    @Test
    @DisplayName("GET /api/shipments/public/tracking/{number} works with no Authorization header")
    void publicTrackingRequiresNoToken() {
        User sender = seedUser("pub-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("pub-receiver@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response =
                getJson("/api/shipments/public/tracking/" + shipment.getTrackingNumber(), null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("trackingNumber").asText())
                .isEqualTo(shipment.getTrackingNumber());
        assertThat(response.getBody().path("status").asText()).isEqualTo("PENDING");
        assertThat(response.getBody().path("originCity").asText()).isEqualTo("Karachi");
        assertThat(response.getBody().path("destCity").asText()).isEqualTo("Berlin");
        assertThat(response.getBody().path("events").isArray()).isTrue();
    }

    @Test
    @DisplayName("the public projection never leaks customer PII")
    void publicProjectionIsRedacted() {
        User sender = seedUser("pii-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("pii-receiver@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.IN_TRANSIT);

        JsonNode body =
                getJson("/api/shipments/public/tracking/" + shipment.getTrackingNumber(), null).getBody();

        // No names, no street addresses, no internal ids, no weight.
        assertThat(body.has("senderName")).isFalse();
        assertThat(body.has("receiverName")).isFalse();
        assertThat(body.has("senderId")).isFalse();
        assertThat(body.has("receiverId")).isFalse();
        assertThat(body.has("originStreet")).isFalse();
        assertThat(body.has("destStreet")).isFalse();
        assertThat(body.has("weight")).isFalse();
        assertThat(body.has("id")).isFalse();
        // The transport-relevant fields are present.
        assertThat(body.has("originCity")).isTrue();
        assertThat(body.has("destCountry")).isTrue();
        assertThat(body.has("events")).isTrue();
    }

    @Test
    @DisplayName("public tracking includes the event history")
    void publicTrackingIncludesEvents() {
        User sender = seedUser("ev-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("ev-receiver@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.IN_TRANSIT);
        data.addTrackingEvent(shipment, "PENDING", "Karachi");
        data.addTrackingEvent(shipment, "IN_TRANSIT", "Dubai");

        JsonNode events = getJson("/api/shipments/public/tracking/" + shipment.getTrackingNumber(), null)
                .getBody().path("events");

        assertThat(events).hasSize(2);
        assertThat(events.get(0).path("location").asText()).isIn("Karachi", "Dubai");
        assertThat(events.get(0).has("timestamp")).isTrue();
    }

    @Test
    @DisplayName("an unknown tracking number returns 404 with the standard error envelope")
    void unknownTrackingNumberReturns404() {
        ResponseEntity<JsonNode> response = getJson("/api/shipments/public/tracking/SLP-DOESNOTEXIST", null);

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
        assertThat(response.getBody().path("message").asText()).contains("not found");
    }

    @Test
    @DisplayName("the authenticated tracking endpoint still requires a token (401 anonymous)")
    void authenticatedTrackingStillProtected() {
        User sender = seedUser("auth-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("auth-receiver@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> anonymous =
                getJson("/api/shipments/tracking/" + shipment.getTrackingNumber(), null);
        assertThat(anonymous.getStatusCode().value()).isEqualTo(401);

        // The sender sees the full, un-redacted record.
        ResponseEntity<JsonNode> asSender =
                getJson("/api/shipments/tracking/" + shipment.getTrackingNumber(), loginAs(sender));
        assertThat(asSender.getStatusCode().value()).isEqualTo(200);
        assertThat(asSender.getBody().path("senderName").asText()).isEqualTo("Test CUSTOMER");
    }

    @Test
    @DisplayName("an unrelated authenticated customer cannot read someone else's shipment (403)")
    void unrelatedCustomerForbidden() {
        User sender = seedUser("own-sender@slp.test", Role.CUSTOMER);
        User receiver = seedUser("own-receiver@slp.test", Role.CUSTOMER);
        User stranger = seedUser("stranger@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(sender, receiver, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response =
                getJson("/api/shipments/tracking/" + shipment.getTrackingNumber(), loginAs(stranger));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
    }
}
