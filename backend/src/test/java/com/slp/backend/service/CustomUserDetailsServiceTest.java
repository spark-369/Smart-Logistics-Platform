package com.slp.backend.service;

import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/** Unit tests for {@link CustomUserDetailsService}. */
@ExtendWith(MockitoExtension.class)
@DisplayName("CustomUserDetailsService")
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .email("dispatcher@slp.test")
                .password("hashed-password")
                .firstName("Dee")
                .lastName("Spatch")
                .role(Role.DISPATCHER)
                .enabled(true)
                .build();
    }

    @Test
    @DisplayName("maps a persisted user to Spring Security authorities with the ROLE_ prefix")
    void loadUserByUsername_mapsRoleToAuthority() {
        when(userRepository.findByEmail("dispatcher@slp.test")).thenReturn(Optional.of(user));

        UserDetails details = service.loadUserByUsername("dispatcher@slp.test");

        assertThat(details.getUsername()).isEqualTo("dispatcher@slp.test");
        assertThat(details.getPassword()).isEqualTo("hashed-password");
        assertThat(details.isEnabled()).isTrue();
        assertThat(details.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_DISPATCHER");
    }

    @Test
    @DisplayName("marks a disabled account as disabled")
    void loadUserByUsername_disabledAccountIsDisabled() {
        user.setEnabled(false);
        when(userRepository.findByEmail("dispatcher@slp.test")).thenReturn(Optional.of(user));

        UserDetails details = service.loadUserByUsername("dispatcher@slp.test");

        assertThat(details.isEnabled()).isFalse();
    }

    @Test
    @DisplayName("throws UsernameNotFoundException for an unknown email")
    void loadUserByUsername_unknownEmailThrows() {
        when(userRepository.findByEmail("ghost@slp.test")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUserByUsername("ghost@slp.test"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("ghost@slp.test");
    }
}
