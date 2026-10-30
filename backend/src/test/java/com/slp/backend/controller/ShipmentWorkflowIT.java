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

/** End-to-end tests for the shipment lifecycle and role-based listing scope. */
@DisplayName("Shipment workflow (end-to-end)")
class ShipmentWorkflowIT extends AbstractIntegrationTest {

    @Autowired
    private TestDataFactory data;

    private String shipmentJson(Long senderId, Long receiverId) {
        return """
                {"senderId": %d, "receiverId": %d,
                 "originStreet": "1 Origin St", "originCity": "Karachi", "originState": "Sindh",
                 "originCountry": "Pakistan", "originZip": "74000",
                 "destStreet": "2 Dest St", "destCity": "Berlin", "destState": "Berlin",
                 "destCountry": "Germany", "destZip": "10115",
                 "weight": 12.5, "description": "Electronics"}
                """.formatted(senderId, receiverId);
    }

    @Test
    @DisplayName("a CUSTOMER can create a shipment for themselves and it starts PENDING")
    void customerCreatesShipment() {
        User customer = seedUser("wf-cust@slp.test", Role.CUSTOMER);
        User receiver = seedUser("wf-recv@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson(
                "/api/shipments", shipmentJson(customer.getId(), receiver.getId()), loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody().path("status").asText()).isEqualTo("PENDING");
        assertThat(response.getBody().path("trackingNumber").asText()).startsWith("SLP-");
        assertThat(response.getBody().path("senderId").asLong()).isEqualTo(customer.getId());
        assertThat(response.getBody().path("senderName").asText()).isEqualTo("Test CUSTOMER");

        // An initial tracking event must have been recorded automatically.
        Long shipmentId = response.getBody().path("id").asLong();
        ResponseEntity<JsonNode> events =
                getJson("/api/tracking/shipment/" + shipmentId, loginAs(customer));
        assertThat(events.getStatusCode().value()).isEqualTo(200);
        assertThat(events.getBody()).isNotEmpty();
    }

    @Test
    @DisplayName("a CUSTOMER cannot forge another user as the sender (403)")
    void customerCannotForgeSender() {
        User customer = seedUser("wf-forge@slp.test", Role.CUSTOMER);
        User victim = seedUser("wf-victim@slp.test", Role.CUSTOMER);
        User receiver = seedUser("wf-recv2@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson(
                "/api/shipments", shipmentJson(victim.getId(), receiver.getId()), loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(shipmentRepository.count()).isZero();
    }

    @Test
    @DisplayName("sender and receiver must differ (400)")
    void senderMustDifferFromReceiver() {
        User customer = seedUser("wf-same@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson(
                "/api/shipments", shipmentJson(customer.getId(), customer.getId()), loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().path("message").asText()).contains("different");
    }

    @Test
    @DisplayName("createShipment validates the payload (400 with field errors)")
    void createValidatesPayload() {
        User customer = seedUser("wf-invalid@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson("/api/shipments", """
                {"senderId": %d, "receiverId": %d, "originStreet": "", "originCity": "",
                 "originState": "", "originCountry": "", "originZip": "",
                 "destStreet": "", "destCity": "", "destState": "", "destCountry": "", "destZip": ""}
                """.formatted(customer.getId(), customer.getId() + 1), loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().path("data").path("originCity").asText()).isNotBlank();
    }

    @Test
    @DisplayName("a CUSTOMER listing shipments only sees their own (sender or receiver)")
    void customerListingIsScoped() {
        User mine = seedUser("scope-mine@slp.test", Role.CUSTOMER);
        User peer = seedUser("scope-peer@slp.test", Role.CUSTOMER);
        User outsider = seedUser("scope-out@slp.test", Role.CUSTOMER);
        User outsider2 = seedUser("scope-out2@slp.test", Role.CUSTOMER);

        data.createShipment(mine, peer, ShipmentStatus.PENDING);         // visible to `mine`
        data.createShipment(outsider, outsider2, ShipmentStatus.PENDING); // not visible

        JsonNode content = getJson("/api/shipments", loginAs(mine)).getBody().path("content");

        assertThat(content).hasSize(1);
        assertThat(content.get(0).path("senderId").asLong()).isEqualTo(mine.getId());
    }

    @Test
    @DisplayName("a DISPATCHER listing shipments sees everything")
    void dispatcherListingSeesAll() {
        User a = seedUser("all-a@slp.test", Role.CUSTOMER);
        User b = seedUser("all-b@slp.test", Role.CUSTOMER);
        User dispatcher = seedUser("all-disp@slp.test", Role.DISPATCHER);
        data.createShipment(a, b, ShipmentStatus.PENDING);
        data.createShipment(b, a, ShipmentStatus.DELIVERED);

        JsonNode content = getJson("/api/shipments", loginAs(dispatcher)).getBody().path("content");

        assertThat(content).hasSize(2);
    }

    @Test
    @DisplayName("a DISPATCHER can filter shipments by status")
    void filterByStatus() {
        User a = seedUser("flt-a@slp.test", Role.CUSTOMER);
        User b = seedUser("flt-b@slp.test", Role.CUSTOMER);
        User dispatcher = seedUser("flt-disp@slp.test", Role.DISPATCHER);
        data.createShipment(a, b, ShipmentStatus.PENDING);
        data.createShipment(b, a, ShipmentStatus.DELIVERED);

        JsonNode content = getJson("/api/shipments/status/DELIVERED", loginAs(dispatcher))
                .getBody().path("content");

        assertThat(content).hasSize(1);
        assertThat(content.get(0).path("status").asText()).isEqualTo("DELIVERED");
    }

    @Test
    @DisplayName("a DISPATCHER advances a shipment status via a tracking event and DELIVERED stamps actualDelivery")
    void dispatcherAdvancesStatus() {
        User a = seedUser("st-a@slp.test", Role.CUSTOMER);
        User b = seedUser("st-b@slp.test", Role.CUSTOMER);
        User dispatcher = seedUser("st-disp@slp.test", Role.DISPATCHER);
        Shipment shipment = data.createShipment(a, b, ShipmentStatus.PENDING);
        String token = loginAs(dispatcher);

        ResponseEntity<JsonNode> inTransit = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "IN_TRANSIT", "location": "Dubai"}
                """.formatted(shipment.getId()), token);
        assertThat(inTransit.getStatusCode().value()).isEqualTo(201);
        assertThat(shipmentRepository.findById(shipment.getId()).orElseThrow().getStatus())
                .isEqualTo(ShipmentStatus.IN_TRANSIT);

        ResponseEntity<JsonNode> delivered = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "DELIVERED", "location": "Berlin"}
                """.formatted(shipment.getId()), token);
        assertThat(delivered.getStatusCode().value()).isEqualTo(201);
        Shipment reloaded = shipmentRepository.findById(shipment.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(ShipmentStatus.DELIVERED);
        assertThat(reloaded.getActualDelivery()).isNotNull();
    }

    @Test
    @DisplayName("an ASSIGNED event is rejected without a driver and vehicle (400)")
    void assignedRequiresDriverAndVehicle() {
        User a = seedUser("as-a@slp.test", Role.CUSTOMER);
        User b = seedUser("as-b@slp.test", Role.CUSTOMER);
        User dispatcher = seedUser("as-disp@slp.test", Role.DISPATCHER);
        Shipment shipment = data.createShipment(a, b, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "ASSIGNED", "location": "Karachi"}
                """.formatted(shipment.getId()), loginAs(dispatcher));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().path("message").asText()).contains("driver and vehicle");
        assertThat(shipmentRepository.findById(shipment.getId()).orElseThrow().getStatus())
                .isEqualTo(ShipmentStatus.PENDING);
    }

    @Test
    @DisplayName("there is no standalone status endpoint: PATCH /api/shipments/{id}/status is gone")
    void noStandaloneStatusEndpoint() {
        User a = seedUser("no-a@slp.test", Role.CUSTOMER);
        User b = seedUser("no-b@slp.test", Role.CUSTOMER);
        User dispatcher = seedUser("no-disp@slp.test", Role.DISPATCHER);
        Shipment shipment = data.createShipment(a, b, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response = patchJson(
                "/api/shipments/" + shipment.getId() + "/status", """
                        {"status": "DELIVERED"}
                        """, loginAs(dispatcher));

        // No handler is mapped, so the request is refused rather than silently succeeding.
        assertThat(response.getStatusCode().value()).isIn(404, 405);
        assertThat(shipmentRepository.findById(shipment.getId()).orElseThrow().getStatus())
                .isEqualTo(ShipmentStatus.PENDING);
    }

    @Test
    @DisplayName("a CUSTOMER cannot change a shipment status (403)")
    void customerCannotChangeStatus() {
        User a = seedUser("cs-a@slp.test", Role.CUSTOMER);
        User b = seedUser("cs-b@slp.test", Role.CUSTOMER);
        Shipment shipment = data.createShipment(a, b, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "DELIVERED", "location": "Fake"}
                """.formatted(shipment.getId()), loginAs(a));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(shipmentRepository.findById(shipment.getId()).orElseThrow().getStatus())
                .isEqualTo(ShipmentStatus.PENDING);
    }

    @Test
    @DisplayName("a CANCELLED event cancels the shipment (no status is unreachable without the removed endpoint)")
    void cancelledViaEvent() {
        User a = seedUser("cn-a@slp.test", Role.CUSTOMER);
        User b = seedUser("cn-b@slp.test", Role.CUSTOMER);
        User dispatcher = seedUser("cn-disp@slp.test", Role.DISPATCHER);
        Shipment shipment = data.createShipment(a, b, ShipmentStatus.PENDING);

        ResponseEntity<JsonNode> response = postJson("/api/tracking", """
                {"shipmentId": %d, "status": "CANCELLED", "location": "Karachi",
                 "description": "Customer cancelled"}
                """.formatted(shipment.getId()), loginAs(dispatcher));

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(shipmentRepository.findById(shipment.getId()).orElseThrow().getStatus())
                .isEqualTo(ShipmentStatus.CANCELLED);
    }

    @Test
    @DisplayName("only an ADMIN can delete a shipment (403 vs 200)")
    void onlyAdminCanDeleteShipment() {
        User a = seedUser("dl-a@slp.test", Role.CUSTOMER);
        User b = seedUser("dl-b@slp.test", Role.CUSTOMER);
        User dispatcher = seedUser("dl-disp@slp.test", Role.DISPATCHER);
        User admin = seedUser("dl-admin@slp.test", Role.ADMIN);
        Shipment first = data.createShipment(a, b, ShipmentStatus.PENDING);
        Shipment second = data.createShipment(a, b, ShipmentStatus.PENDING);

        assertThat(deleteJson("/api/shipments/" + first.getId(), loginAs(dispatcher)).getStatusCode().value())
                .isEqualTo(403);
        assertThat(deleteJson("/api/shipments/" + second.getId(), loginAs(admin)).getStatusCode().value())
                .isEqualTo(200);
        assertThat(shipmentRepository.findById(second.getId())).isEmpty();
    }
}
