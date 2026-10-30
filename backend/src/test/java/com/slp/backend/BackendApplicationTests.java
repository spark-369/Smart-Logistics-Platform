package com.slp.backend;

import com.slp.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Smoke test: the whole Spring context must start with the test profile (in-memory H2, no
 * PostgreSQL required) and expose the expected beans.
 */
class BackendApplicationTests extends AbstractIntegrationTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void contextLoads() {
        assertThat(applicationContext).isNotNull();
        assertThat(applicationContext.containsBean("securityConfig")).isTrue();
        assertThat(applicationContext.containsBean("jwtAuthFilter")).isTrue();
    }

    @Test
    void actuatorHealthEndpointIsPublic() {
        var response = getJson("/actuator/health", null);
        // Actuator is disabled in the test profile, so the endpoint must not be reachable.
        assertThat(response.getStatusCode().value()).isIn(404, 403, 401);
    }
}
