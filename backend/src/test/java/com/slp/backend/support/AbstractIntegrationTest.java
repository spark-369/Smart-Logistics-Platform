package com.slp.backend.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.NotificationRepository;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.TrackingEventRepository;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.repository.VehicleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

/**
 * Base class for end-to-end HTTP tests.
 *
 * <p>Boots the full application on a random port so the real Spring Security filter chain, the real
 * JWT filter, the real controllers, services, repositories and exception handling are all
 * exercised. Only the database is swapped for in-memory H2.
 *
 * <p>Spring Boot 4 no longer auto-configures a {@code TestRestTemplate} for a random-port
 * {@code @SpringBootTest}, so {@link AutoConfigureTestRestTemplate} opts back in explicitly.
 *
 * <p>Tests seed users directly through repositories (fast) and then authenticate through the public
 * {@code /api/auth/login} endpoint, so token generation always uses the production code path.
 *
 * <p>Every helper that is expected to succeed validates the response and fails with a descriptive
 * message, so a broken fixture surfaces as a clear error rather than a confusing assertion failure
 * several lines later.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    protected static final String DEFAULT_PASSWORD = "Secret123!";

    /** Jackson 2 reader used to decode raw response bodies; see {@link #exchange}. */
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    protected TestRestTemplate rest;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected DriverRepository driverRepository;

    @Autowired
    protected VehicleRepository vehicleRepository;

    @Autowired
    protected ShipmentRepository shipmentRepository;

    @Autowired
    protected TrackingEventRepository trackingEventRepository;

    @Autowired
    protected NotificationRepository notificationRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    /**
     * Clears every table before each test.
     *
     * <p>Deletion is ordered child-first so foreign key constraints are never violated:
     * {@code tracking_events} references {@code shipments}; {@code shipments} references
     * {@code users}, {@code drivers} and {@code vehicles}; {@code vehicles} references
     * {@code drivers}; {@code drivers} and {@code notifications} reference {@code users}.
     *
     * <p>This is deliberately not {@code @Transactional}: the tests talk to a real server over HTTP,
     * so a test-managed transaction would not roll anything back.
     */
    @BeforeEach
    void resetDatabase() {
        trackingEventRepository.deleteAll();
        shipmentRepository.deleteAll();
        notificationRepository.deleteAll();
        vehicleRepository.deleteAll();
        driverRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ---------------------------------------------------------------------------------------------
    // Seeding helpers
    // ---------------------------------------------------------------------------------------------

    /** Seeds an enabled user with the default password. */
    protected User seedUser(String email, Role role) {
        return seedUser(email, role, true);
    }

    /**
     * Seeds a user with the default password.
     *
     * <p>The last name is set to the role name so assertions can rely on a deterministic
     * {@code "First Last"} display name (for example {@code "Test CUSTOMER"}).
     */
    protected User seedUser(String email, Role role, boolean enabled) {
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(DEFAULT_PASSWORD))
                .firstName("Test")
                .lastName(role.name())
                .phoneNumber("+10000000000")
                .role(role)
                .enabled(enabled)
                .build();
        return userRepository.save(user);
    }

    /** Seeds an enabled user under a collision-proof generated email. */
    protected User seedUser(Role role) {
        return seedUser(uniqueEmail(role), role);
    }

    protected String uniqueEmail(Role role) {
        return role.name().toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8) + "@slp.test";
    }

    // ---------------------------------------------------------------------------------------------
    // Auth helpers
    // ---------------------------------------------------------------------------------------------

    /**
     * Registers a CUSTOMER through the public API and returns the parsed response body.
     *
     * <p>Fails fast on a non-2xx response: a silently-null body previously produced a confusing
     * {@code NullPointerException} in the calling test rather than pointing at the registration
     * call that actually broke.
     */
    protected JsonNode register(String email) {
        String body = """
                {
                  "email": "%s",
                  "password": "%s",
                  "firstName": "New",
                  "lastName": "Customer",
                  "phoneNumber": "+19999999999"
                }
                """.formatted(email, DEFAULT_PASSWORD);
        ResponseEntity<JsonNode> response = postJson("/api/auth/register", body, null);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException(
                    "Registration failed for " + email + ": " + response.getStatusCode());
        }
        return response.getBody();
    }

    /** Authenticates through the real login endpoint and returns the raw JWT. */
    protected String loginAndGetToken(String email, String password) {
        String body = """
                {"email": "%s", "password": "%s"}
                """.formatted(email, password);
        ResponseEntity<JsonNode> response = postJson("/api/auth/login", body, null);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException("Login failed for " + email + ": " + response.getStatusCode());
        }
        return response.getBody().path("token").asText();
    }

    protected String loginAs(User user) {
        return loginAndGetToken(user.getEmail(), DEFAULT_PASSWORD);
    }

    // ---------------------------------------------------------------------------------------------
    // HTTP helpers
    // ---------------------------------------------------------------------------------------------

    protected HttpHeaders jsonHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return headers;
    }

    protected ResponseEntity<JsonNode> postJson(String path, String jsonBody, String token) {
        return exchange(path, HttpMethod.POST, jsonBody, token);
    }

    protected ResponseEntity<JsonNode> putJson(String path, String jsonBody, String token) {
        return exchange(path, HttpMethod.PUT, jsonBody, token);
    }

    protected ResponseEntity<JsonNode> patchJson(String path, String jsonBody, String token) {
        return exchange(path, HttpMethod.PATCH, jsonBody, token);
    }

    protected ResponseEntity<JsonNode> getJson(String path, String token) {
        return exchange(path, HttpMethod.GET, null, token);
    }

    protected ResponseEntity<JsonNode> deleteJson(String path, String token) {
        return exchange(path, HttpMethod.DELETE, null, token);
    }

    private ResponseEntity<JsonNode> exchange(String path, HttpMethod method, String jsonBody, String token) {
        HttpEntity<String> entity = new HttpEntity<>(jsonBody, jsonHeaders(token));
        /*
         * Spring Boot 4 registers Jackson 3 (tools.jackson) HTTP message converters, which cannot
         * materialise a Jackson 2 com.fasterxml.jackson.databind.JsonNode. Asking the converter
         * layer for a JsonNode therefore fails at runtime with
         * "Cannot construct instance of com.fasterxml.jackson.databind.JsonNode".
         *
         * Reading the body as a plain String and parsing it here keeps the whole response tree on
         * the Jackson 2 API the assertions are written against, and leaves the production
         * serialisation path (which is Jackson 3) untouched.
         */
        ResponseEntity<String> raw = rest.exchange(path, method, entity, String.class);
        return ResponseEntity.status(raw.getStatusCode())
                .headers(raw.getHeaders())
                .body(parseJson(raw.getBody()));
    }

    /** Parses a raw response body, returning {@code null} for an empty body (e.g. HTTP 204). */
    private static JsonNode parseJson(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            return JSON.readTree(body);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Response body was not valid JSON: " + body, ex);
        }
    }
}
