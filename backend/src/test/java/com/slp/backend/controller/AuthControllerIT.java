package com.slp.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end tests for {@code /api/auth/**}.
 *
 * <p>Exercises the real HTTP stack: request validation, BCrypt password encoding, the
 * AuthenticationManager, JWT issuing and the security filter chain.
 */
@DisplayName("AuthController (end-to-end)")
class AuthControllerIT extends AbstractIntegrationTest {

    private ResponseEntity<JsonNode> registerWithRole(String email, String role) {
        String roleField = role == null ? "" : ", \"role\": \"" + role + "\"";
        return postJson("/api/auth/register", """
                {"email": "%s", "password": "%s", "firstName": "New", "lastName": "Person"%s}
                """.formatted(email, DEFAULT_PASSWORD, roleField), null);
    }

    @Test
    @DisplayName("POST /api/auth/register creates a CUSTOMER and returns a usable token")
    void registerCreatesCustomer() {
        JsonNode body = register("fresh@slp.test");

        assertThat(body.path("token").asText()).isNotBlank();
        assertThat(body.path("type").asText()).isEqualTo("Bearer");
        assertThat(body.path("email").asText()).isEqualTo("fresh@slp.test");
        assertThat(body.path("role").asText()).isEqualTo("CUSTOMER");
        assertThat(body.path("id").asLong()).isPositive();

        // The returned token must immediately work against a protected endpoint.
        ResponseEntity<JsonNode> lookup = getJson("/api/users/lookup", body.path("token").asText());
        assertThat(lookup.getStatusCode().value()).isEqualTo(200);
    }

    @Test
    @DisplayName("the stored password is BCrypt encoded, never plain text")
    void registerStoresEncodedPassword() {
        register("encoded@slp.test");

        User stored = userRepository.findByEmail("encoded@slp.test").orElseThrow();
        assertThat(stored.getPassword()).isNotEqualTo(DEFAULT_PASSWORD);
        assertThat(stored.getPassword()).startsWith("$2");
        assertThat(passwordEncoder.matches(DEFAULT_PASSWORD, stored.getPassword())).isTrue();
    }

    @Test
    @DisplayName("POST /api/auth/register rejects a duplicate email with 400")
    void registerRejectsDuplicateEmail() {
        register("dupe@slp.test");

        ResponseEntity<JsonNode> second = registerWithRole("dupe@slp.test", null);

        assertThat(second.getStatusCode().value()).isEqualTo(400);
        assertThat(second.getBody().path("success").asBoolean()).isFalse();
        assertThat(second.getBody().path("message").asText()).contains("already registered");
    }

    @Test
    @DisplayName("POST /api/auth/register cannot escalate to ADMIN")
    void registerCannotCreateAdmin() {
        ResponseEntity<JsonNode> response = registerWithRole("wannabe-admin@slp.test", "ADMIN");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(userRepository.findByEmail("wannabe-admin@slp.test")).isEmpty();
    }

    @Test
    @DisplayName("POST /api/auth/register cannot escalate to DISPATCHER")
    void registerCannotCreateDispatcher() {
        ResponseEntity<JsonNode> response = registerWithRole("wannabe-dispatcher@slp.test", "DISPATCHER");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(userRepository.findByEmail("wannabe-dispatcher@slp.test")).isEmpty();
    }

    @Test
    @DisplayName("POST /api/auth/register cannot escalate to DRIVER")
    void registerCannotCreateDriver() {
        ResponseEntity<JsonNode> response = registerWithRole("wannabe-driver@slp.test", "DRIVER");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(userRepository.findByEmail("wannabe-driver@slp.test")).isEmpty();
    }

    @Test
    @DisplayName("POST /api/auth/register returns field-level validation errors")
    void registerValidatesInput() {
        ResponseEntity<JsonNode> response = postJson("/api/auth/register", """
                {"email": "not-an-email", "password": "123", "firstName": "", "lastName": ""}
                """, null);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        JsonNode errors = response.getBody().path("data");
        assertThat(errors.path("email").asText()).contains("valid");
        assertThat(errors.path("password").asText()).contains("6 characters");
        assertThat(errors.path("firstName").asText()).isNotBlank();
        assertThat(errors.path("lastName").asText()).isNotBlank();
    }

    @Test
    @DisplayName("POST /api/auth/login returns a token for valid credentials")
    void loginSucceeds() {
        User user = seedUser("login@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson("/api/auth/login", """
                {"email": "%s", "password": "%s"}
                """.formatted(user.getEmail(), DEFAULT_PASSWORD), null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().path("token").asText()).isNotBlank();
        assertThat(response.getBody().path("role").asText()).isEqualTo("CUSTOMER");
    }

    @Test
    @DisplayName("POST /api/auth/login rejects a wrong password with 401")
    void loginRejectsWrongPassword() {
        seedUser("wrongpw@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> response = postJson("/api/auth/login", """
                {"email": "wrongpw@slp.test", "password": "NotThePassword1!"}
                """, null);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getBody().path("message").asText()).contains("Invalid email or password");
    }

    @Test
    @DisplayName("POST /api/auth/login rejects a disabled account with 401 (not 403)")
    void loginRejectsDisabledAccount() {
        User disabled = seedUser("disabled@slp.test", Role.CUSTOMER, false);

        ResponseEntity<JsonNode> response = postJson("/api/auth/login", """
                {"email": "%s", "password": "%s"}
                """.formatted(disabled.getEmail(), DEFAULT_PASSWORD), null);

        // Regression guard: this used to answer 403 because AuthServiceImpl wrapped every
        // authentication failure in UnauthorizedException, which the handler maps to FORBIDDEN.
        // A 403 on login makes the SPA route the user to /unauthorized instead of showing the
        // error on the form.
        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getBody().path("success").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("login failure never reports 403, so the SPA never misreads it as a permissions error")
    void loginFailureIsNeverForbidden() {
        seedUser("status-check@slp.test", Role.CUSTOMER);

        ResponseEntity<JsonNode> wrongPassword = postJson("/api/auth/login", """
                {"email": "status-check@slp.test", "password": "DefinitelyWrong1!"}
                """, null);
        ResponseEntity<JsonNode> unknownUser = postJson("/api/auth/login", """
                {"email": "ghost@slp.test", "password": "Whatever123!"}
                """, null);

        assertThat(wrongPassword.getStatusCode().value()).isEqualTo(401);
        assertThat(unknownUser.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("POST /api/auth/login rejects an unknown email with 401 (no user enumeration)")
    void loginRejectsUnknownEmail() {
        ResponseEntity<JsonNode> response = postJson("/api/auth/login", """
                {"email": "nobody@slp.test", "password": "Whatever123!"}
                """, null);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        assertThat(response.getBody().path("message").asText()).contains("Invalid email or password");
    }
}
