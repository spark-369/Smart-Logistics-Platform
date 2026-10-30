package com.slp.backend.config;

import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.util.AppConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AdminBootstrap}.
 *
 * <p>This runner is the only way a fresh deployment obtains its first privileged account, because
 * self-registration is restricted to CUSTOMER. Its guard rails therefore matter: it must not
 * overwrite an existing admin, must respect the enable flag, and must refuse to create the default
 * password in the {@code prod} profile.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AdminBootstrap")
class AdminBootstrapTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminBootstrap bootstrap;

    @BeforeEach
    void setUp() {
        bootstrap = new AdminBootstrap(userRepository, passwordEncoder);
        ReflectionTestUtils.setField(bootstrap, "enabled", true);
        ReflectionTestUtils.setField(bootstrap, "adminEmail", AppConstants.DEFAULT_ADMIN_EMAIL);
        ReflectionTestUtils.setField(bootstrap, "adminPassword", "SuperSecret123!");
        ReflectionTestUtils.setField(bootstrap, "activeProfile", "dev");
    }

    @Test
    @DisplayName("creates the first administrator when none exists")
    void createsFirstAdmin() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);
        when(passwordEncoder.encode("SuperSecret123!")).thenReturn("$2a$12$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        bootstrap.run(null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(Role.ADMIN);
        assertThat(saved.getEmail()).isEqualTo(AppConstants.DEFAULT_ADMIN_EMAIL);
        assertThat(saved.getPassword()).isEqualTo("$2a$12$encoded");
        assertThat(saved.getEnabled()).isTrue();
    }

    @Test
    @DisplayName("does nothing when an administrator already exists")
    void skipsWhenAdminExists() {
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(1L);

        bootstrap.run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("does nothing when the bootstrap is disabled")
    void skipsWhenDisabled() {
        ReflectionTestUtils.setField(bootstrap, "enabled", false);

        bootstrap.run(null);

        verify(userRepository, never()).countByRole(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("refuses to create the default password in the prod profile")
    void refusesDefaultPasswordInProd() {
        ReflectionTestUtils.setField(bootstrap, "activeProfile", "prod");
        ReflectionTestUtils.setField(bootstrap, "adminPassword", AppConstants.DEFAULT_ADMIN_PASSWORD);
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);

        bootstrap.run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("creates an admin in prod when a non-default password is configured")
    void allowsCustomPasswordInProd() {
        ReflectionTestUtils.setField(bootstrap, "activeProfile", "prod");
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(0L);
        when(passwordEncoder.encode(any())).thenReturn("$2a$12$encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        bootstrap.run(null);

        verify(userRepository).save(any(User.class));
    }
}
