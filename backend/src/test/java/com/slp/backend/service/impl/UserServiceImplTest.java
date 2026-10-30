package com.slp.backend.service.impl;

import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.request.UserUpdateRequest;
import com.slp.backend.dto.response.UserSummaryResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link UserServiceImpl}.
 *
 * <p>Covers the administrator user-management paths: creation with an explicit role, email
 * uniqueness on both create and update, and the summary projection that deliberately omits the
 * password hash.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserServiceImpl")
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    private User existing;

    @BeforeEach
    void setUp() {
        existing = User.builder()
                .id(5L)
                .email("existing@slp.test")
                .password("$2a$12$hashed")
                .firstName("Existing")
                .lastName("User")
                .phoneNumber("+10000000000")
                .role(Role.CUSTOMER)
                .enabled(true)
                .build();
    }

    private RegisterRequest registerRequest(String email, Role role) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("Secret123!");
        request.setFirstName("New");
        request.setLastName("Person");
        request.setPhoneNumber("+19999999999");
        request.setRole(role);
        return request;
    }

    private UserUpdateRequest updateRequest(String email) {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setEmail(email);
        request.setFirstName("Updated");
        request.setLastName("Name");
        request.setPhoneNumber("+12222222222");
        request.setRole(Role.DISPATCHER);
        request.setEnabled(false);
        return request;
    }

    @Nested
    @DisplayName("createUser")
    class CreateUser {

        @Test
        @DisplayName("encodes the password and persists the explicitly supplied role")
        void createsUserWithGivenRole() {
            when(userRepository.existsByEmail("dispatch@slp.test")).thenReturn(false);
            when(passwordEncoder.encode("Secret123!")).thenReturn("$2a$12$encoded");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UserSummaryResponse response =
                    userService.createUser(registerRequest("dispatch@slp.test", Role.DISPATCHER), Role.DISPATCHER);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            User saved = captor.getValue();
            assertThat(saved.getPassword()).isEqualTo("$2a$12$encoded");
            assertThat(saved.getPassword()).isNotEqualTo("Secret123!");
            assertThat(saved.getRole()).isEqualTo(Role.DISPATCHER);
            assertThat(saved.getEnabled()).isTrue();
            assertThat(response.getRole()).isEqualTo("DISPATCHER");
        }

        @Test
        @DisplayName("the summary projection carries the identity fields the admin UI needs")
        void summaryCarriesIdentityFields() {
            when(userRepository.existsByEmail("safe@slp.test")).thenReturn(false);
            when(passwordEncoder.encode(any())).thenReturn("$2a$12$encoded");
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UserSummaryResponse response =
                    userService.createUser(registerRequest("safe@slp.test", Role.CUSTOMER), Role.CUSTOMER);

            // UserSummaryResponse has no password field at all, so this is the whole projection.
            assertThat(response.getEmail()).isEqualTo("safe@slp.test");
            assertThat(response.getFirstName()).isEqualTo("New");
            assertThat(response.getLastName()).isEqualTo("Person");
            assertThat(response.getPhoneNumber()).isEqualTo("+19999999999");
        }

        @Test
        @DisplayName("rejects a duplicate email without persisting anything")
        void rejectsDuplicateEmail() {
            when(userRepository.existsByEmail("existing@slp.test")).thenReturn(true);

            assertThatThrownBy(() ->
                    userService.createUser(registerRequest("existing@slp.test", Role.CUSTOMER), Role.CUSTOMER))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already registered");

            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("updateUser")
    class UpdateUser {

        @Test
        @DisplayName("applies every mutable field")
        void appliesAllFields() {
            when(userRepository.findById(5L)).thenReturn(Optional.of(existing));
            when(userRepository.existsByEmail("changed@slp.test")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UserSummaryResponse response = userService.updateUser(5L, updateRequest("changed@slp.test"));

            assertThat(response.getEmail()).isEqualTo("changed@slp.test");
            assertThat(response.getFirstName()).isEqualTo("Updated");
            assertThat(response.getLastName()).isEqualTo("Name");
            assertThat(response.getPhoneNumber()).isEqualTo("+12222222222");
            assertThat(response.getRole()).isEqualTo("DISPATCHER");
            assertThat(response.getEnabled()).isFalse();
        }

        @Test
        @DisplayName("keeps the current email when it is unchanged (no self-conflict)")
        void keepsUnchangedEmail() {
            when(userRepository.findById(5L)).thenReturn(Optional.of(existing));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            userService.updateUser(5L, updateRequest("existing@slp.test"));

            // A no-op email change must not run the uniqueness check against the same row.
            verify(userRepository, never()).existsByEmail("existing@slp.test");
        }

        @Test
        @DisplayName("rejects taking an email that belongs to another user")
        void rejectsEmailTakenByAnotherUser() {
            when(userRepository.findById(5L)).thenReturn(Optional.of(existing));
            when(userRepository.existsByEmail("taken@slp.test")).thenReturn(true);

            assertThatThrownBy(() -> userService.updateUser(5L, updateRequest("taken@slp.test")))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already in use");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("404s for an unknown user")
        void unknownUser() {
            when(userRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.updateUser(404L, updateRequest("x@slp.test")))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("queries")
    class Queries {

        @Test
        @DisplayName("getAllUserSummaryPages maps each entity to a summary")
        void mapsPage() {
            Pageable pageable = PageRequest.of(0, 20);
            when(userRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(existing)));

            Page<UserSummaryResponse> page = userService.getAllUserSummaryPages(pageable);

            assertThat(page.getTotalElements()).isEqualTo(1);
            assertThat(page.getContent().get(0).getEmail()).isEqualTo("existing@slp.test");
        }

        @Test
        @DisplayName("getUserSummariesByRole delegates to the role query")
        void mapsRolePage() {
            Pageable pageable = PageRequest.of(0, 20);
            when(userRepository.findByRole(Role.CUSTOMER, pageable))
                    .thenReturn(new PageImpl<>(List.of(existing)));

            Page<UserSummaryResponse> page = userService.getUserSummariesByRole(Role.CUSTOMER, pageable);

            assertThat(page.getContent()).hasSize(1);
            verify(userRepository).findByRole(Role.CUSTOMER, pageable);
        }

        @Test
        @DisplayName("getUserById throws for a missing id")
        void getUserByIdMissing() {
            when(userRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getUserById(404L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("404");
        }

        @Test
        @DisplayName("getUserByEmail throws for a missing email")
        void getUserByEmailMissing() {
            when(userRepository.findByEmail("ghost@slp.test")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getUserByEmail("ghost@slp.test"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ghost@slp.test");
        }

        @Test
        @DisplayName("getAllUserSummaries maps the full list")
        void mapsFullList() {
            when(userRepository.findAll()).thenReturn(List.of(existing));

            List<UserSummaryResponse> summaries = userService.getAllUserSummaries();

            assertThat(summaries).hasSize(1);
            assertThat(summaries.get(0).getRole()).isEqualTo("CUSTOMER");
        }

        @Test
        @DisplayName("getUserSummaryById projects a single user")
        void summaryById() {
            when(userRepository.findById(5L)).thenReturn(Optional.of(existing));

            UserSummaryResponse response = userService.getUserSummaryById(5L);

            assertThat(response.getId()).isEqualTo(5L);
            assertThat(response.getEnabled()).isTrue();
        }
    }

    @Test
    @DisplayName("deleteUser removes an existing user and 404s for a missing one")
    void deleteUser() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(userRepository.findById(404L)).thenReturn(Optional.empty());

        userService.deleteUser(5L);
        verify(userRepository).delete(existing);

        assertThatThrownBy(() -> userService.deleteUser(404L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
