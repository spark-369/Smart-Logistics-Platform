package com.slp.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.support.AbstractIntegrationTest;
import com.slp.backend.support.TestDataFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/** End-to-end tests for {@code /api/notifications/**}, including per-user isolation. */
@DisplayName("Notifications (end-to-end)")
class NotificationIT extends AbstractIntegrationTest {

    @Autowired
    private TestDataFactory data;

    @Test
    @DisplayName("an ADMIN can notify any user; the recipient sees it and can mark it read")
    void adminNotifiesUser() {
        User admin = seedUser("ntf-admin@slp.test", Role.ADMIN);
        User recipient = seedUser("ntf-recv@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> created = postJson(
                "/api/notifications/" + recipient.getId()
                        + "?title=Shipment%20delayed&message=Your%20parcel%20is%20late",
                null, loginAs(admin));
        assertThat(created.getStatusCode().value()).isEqualTo(201);

        String recipientToken = loginAs(recipient);
        JsonNode page = getJson("/api/notifications/" + recipient.getId(), recipientToken).getBody();
        assertThat(page.path("totalElements").asInt()).isEqualTo(1);
        assertThat(page.path("content").get(0).path("read").asBoolean()).isFalse();

        assertThat(getJson("/api/notifications/unread-count/" + recipient.getId(), recipientToken)
                .getBody().asLong()).isEqualTo(1);

        Long notificationId = page.path("content").get(0).path("id").asLong();
        ResponseEntity<JsonNode> marked = patchJson(
                "/api/notifications/" + notificationId + "/read/" + recipient.getId(), null, recipientToken);
        assertThat(marked.getStatusCode().value()).isEqualTo(200);
        assertThat(getJson("/api/notifications/unread-count/" + recipient.getId(), recipientToken)
                .getBody().asLong()).isZero();
    }

    @Test
    @DisplayName("the unread list only contains unread notifications")
    void unreadListExcludesRead() {
        User recipient = seedUser("ntf-unread@slp.test", Role.CUSTOMER);
        data.createNotification(recipient, "Unread one", false);
        data.createNotification(recipient, "Already read", true);
        String token = loginAs(recipient);

        JsonNode unread = getJson("/api/notifications/unread/" + recipient.getId(), token).getBody();

        assertThat(unread).hasSize(1);
        assertThat(unread.get(0).path("title").asText()).isEqualTo("Unread one");
    }

    @Test
    @DisplayName("mark-all-read clears the unread count")
    void markAllRead() {
        User recipient = seedUser("ntf-all@slp.test", Role.CUSTOMER);
        data.createNotification(recipient, "One", false);
        data.createNotification(recipient, "Two", false);
        String token = loginAs(recipient);

        assertThat(patchJson("/api/notifications/read-all/" + recipient.getId(), null, token)
                .getStatusCode().value()).isEqualTo(200);
        assertThat(getJson("/api/notifications/unread-count/" + recipient.getId(), token)
                .getBody().asLong()).isZero();
    }

    @Test
    @DisplayName("a user cannot read another user's notifications (403)")
    void cannotReadForeignNotifications() {
        User victim = seedUser("ntf-victim@slp.test", Role.CUSTOMER);
        User snooper = seedUser("ntf-snoop@slp.test", Role.CUSTOMER);
        data.createNotification(victim, "Private", false);

        assertThat(getJson("/api/notifications/" + victim.getId(), loginAs(snooper)).getStatusCode().value())
                .isEqualTo(403);
        assertThat(getJson("/api/notifications/unread-count/" + victim.getId(), loginAs(snooper))
                .getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("a non-admin cannot create notifications for others (403)")
    void nonAdminCannotCreateNotification() {
        User customer = seedUser("ntf-cust@slp.test", Role.CUSTOMER);
        User target = seedUser("ntf-target@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson(
                "/api/notifications/" + target.getId() + "?title=Spam&message=Spam", null, loginAs(customer));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    @DisplayName("an ADMIN can read any user's notifications")
    void adminCanReadAnyNotifications() {
        User admin = seedUser("ntf-admin2@slp.test", Role.ADMIN);
        User target = seedUser("ntf-target2@slp.test", Role.CUSTOMER);
        data.createNotification(target, "For target", false);

        assertThat(getJson("/api/notifications/" + target.getId(), loginAs(admin)).getStatusCode().value())
                .isEqualTo(200);
    }
}
