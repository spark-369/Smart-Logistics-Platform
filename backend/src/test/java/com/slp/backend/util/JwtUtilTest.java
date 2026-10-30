package com.slp.backend.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pure unit tests for {@link JwtUtil}: token creation, claim extraction, expiry and validation.
 * No Spring context is started.
 */
@DisplayName("JwtUtil")
class JwtUtilTest {

    /** 64 ASCII characters -> 512 bits, well above the HS256 minimum key size. */
    private static final String SECRET =
            "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    private JwtUtil jwtUtil;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expiration", 3_600_000L);
        userDetails = new User("john@slp.test", "irrelevant",
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
    }

    @Test
    @DisplayName("generates a token whose subject is the username")
    void generateToken_embedsUsernameAsSubject() {
        String token = jwtUtil.generateToken("john@slp.test");

        assertThat(token).isNotBlank();
        assertThat(token.split("\\.")).hasSize(3);
        assertThat(jwtUtil.extractUsername(token)).isEqualTo("john@slp.test");
    }

    @Test
    @DisplayName("extracts an expiration date in the future")
    void generateToken_setsFutureExpiration() {
        String token = jwtUtil.generateToken("john@slp.test");

        assertThat(jwtUtil.extractExpiration(token)).isAfter(new java.util.Date());
    }

    @Test
    @DisplayName("validates a fresh token against the matching user")
    void validateToken_acceptsMatchingUser() {
        String token = jwtUtil.generateToken("john@slp.test");

        assertThat(jwtUtil.validateToken(token, userDetails)).isTrue();
    }

    @Test
    @DisplayName("rejects a token belonging to a different user")
    void validateToken_rejectsDifferentUser() {
        String token = jwtUtil.generateToken("someone.else@slp.test");

        assertThat(jwtUtil.validateToken(token, userDetails)).isFalse();
    }

    @Test
    @DisplayName("rejects an expired token")
    void validateToken_rejectsExpiredToken() {
        // Issue a token that expired one minute ago.
        ReflectionTestUtils.setField(jwtUtil, "expiration", -60_000L);
        String expired = jwtUtil.generateToken("john@slp.test");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 3_600_000L);

        assertThatThrownBy(() -> jwtUtil.validateToken(expired, userDetails))
                .isInstanceOf(io.jsonwebtoken.ExpiredJwtException.class);
    }

    @Test
    @DisplayName("rejects a token signed with a different secret")
    void validateToken_rejectsTokenSignedWithAnotherKey() {
        JwtUtil other = new JwtUtil();
        ReflectionTestUtils.setField(other, "secret",
                "A1B2C3D4E5F60718293A4B5C6D7E8F901A2B3C4D5E6F708192A3B4C5D6E7F809");
        ReflectionTestUtils.setField(other, "expiration", 3_600_000L);
        String foreignToken = other.generateToken("john@slp.test");

        assertThatThrownBy(() -> jwtUtil.extractUsername(foreignToken))
                .isInstanceOf(io.jsonwebtoken.security.SignatureException.class);
    }

    @Test
    @DisplayName("rejects a structurally malformed token")
    void extractUsername_rejectsMalformedToken() {
        assertThatThrownBy(() -> jwtUtil.extractUsername("not.a.jwt"))
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }
}
