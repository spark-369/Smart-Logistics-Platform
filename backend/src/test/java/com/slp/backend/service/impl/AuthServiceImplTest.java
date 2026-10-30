package com.slp.backend.service.impl;

import com.slp.backend.dto.request.LoginRequest;
import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.response.AuthResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthServiceImpl}.
 *
 * <p>Covers the privilege-escalation guard: self-registration must be limited to CUSTOMER so a
 * public caller cannot mint a DISPATCHER or DRIVER account.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthServiceImpl")
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthServiceImpl authService;

    private RegisterRequest registerRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setEmail("new@slp.test");
        registerRequest.setPassword("Secret123!");
        registerRequest.setFirstName("New");
        registerRequest.setLastName("Customer");
        registerRequest.setPhoneNumber("+10000000000");
    }

    private User persistedUser(Role role) {
        return User.builder()
                .id(42L)
                .email("new@slp.test")
                .password("encoded")
                .firstName("New")
                .lastName("Customer")
                .phoneNumber("+10000000000")
                .role(role)
                .enabled(true)
                .build();
    }

    private LoginRequest loginRequest(String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail("new@slp.test");
        request.setPassword(password);
        return request;
    }

    @Test
    @DisplayName("registers a CUSTOMER and returns a token")
    void registersCustomer() {
        registerRequest.setRole(Role.CUSTOMER);
        when(userRepository.existsByEmail("new@slp.test")).thenReturn(false);
        when(passwordEncoder.encode("Secret123!")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(persistedUser(Role.CUSTOMER));
        when(jwtUtil.generateToken("new@slp.test")).thenReturn("jwt-token");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getType()).isEqualTo("Bearer");
        assertThat(response.getRole()).isEqualTo("CUSTOMER");
        assertThat(response.getId()).isEqualTo(42L);
    }

    @Test
    @DisplayName("defaults to CUSTOMER when no role is supplied")
    void defaultsToCustomer() {
        registerRequest.setRole(null);
        when(userRepository.existsByEmail("new@slp.test")).thenReturn(false);
        when(passwordEncoder.encode("Secret123!")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(persistedUser(Role.CUSTOMER));
        when(jwtUtil.generateToken(any())).thenReturn("jwt-token");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response.getRole()).isEqualTo("CUSTOMER");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(captor.getValue().getEnabled()).isTrue();
    }

    @Test
    @DisplayName("rejects self-registration as ADMIN")
    void rejectsAdminSelfRegistration() {
        registerRequest.setRole(Role.ADMIN);
        when(userRepository.existsByEmail("new@slp.test")).thenReturn(false);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ADMIN");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("rejects self-registration as DISPATCHER (privilege escalation guard)")
    void rejectsDispatcherSelfRegistration() {
        registerRequest.setRole(Role.DISPATCHER);
        when(userRepository.existsByEmail("new@slp.test")).thenReturn(false);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("CUSTOMER");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("rejects self-registration as DRIVER (privilege escalation guard)")
    void rejectsDriverSelfRegistration() {
        registerRequest.setRole(Role.DRIVER);
        when(userRepository.existsByEmail("new@slp.test")).thenReturn(false);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("CUSTOMER");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("rejects a duplicate email")
    void rejectsDuplicateEmail() {
        when(userRepository.existsByEmail("new@slp.test")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    @DisplayName("login returns a token for valid credentials")
    void loginReturnsToken() {
        when(userRepository.findByEmail("new@slp.test")).thenReturn(Optional.of(persistedUser(Role.CUSTOMER)));
        when(jwtUtil.generateToken("new@slp.test")).thenReturn("jwt-token");

        AuthResponse response = authService.login(loginRequest("Secret123!"));

        assertThat(response.getToken()).isEqualTo("jwt-token");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("login maps a bad password to BadCredentialsException so the API answers 401")
    void loginRejectsBadCredentials() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(loginRequest("wrong")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    @DisplayName("login propagates DisabledException so the API answers 401, not 403")
    void loginRejectsDisabledAccount() {
        // The provider rejects a disabled account before the credential check.
        when(authenticationManager.authenticate(any()))
                .thenThrow(new DisabledException("User is disabled"));

        assertThatThrownBy(() -> authService.login(loginRequest("Secret123!")))
                .isInstanceOf(DisabledException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    @DisplayName("login maps any other AuthenticationException to BadCredentialsException (never a 500)")
    void loginMapsUnexpectedAuthenticationFailure() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new LockedException("User account is locked"));

        assertThatThrownBy(() -> authService.login(loginRequest("Secret123!")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    @DisplayName("a disabled flag on the loaded user is still rejected after a successful bind")
    void loginRejectsDisabledUserAfterAuthentication() {
        User disabled = persistedUser(Role.CUSTOMER);
        disabled.setEnabled(false);
        when(userRepository.findByEmail("new@slp.test")).thenReturn(Optional.of(disabled));

        assertThatThrownBy(() -> authService.login(loginRequest("Secret123!")))
                .isInstanceOf(DisabledException.class)
                .hasMessageContaining("disabled");
    }
}
