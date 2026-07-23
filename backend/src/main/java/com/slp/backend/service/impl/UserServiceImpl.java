package com.slp.backend.service.impl;

import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.request.UserUpdateRequest;
import com.slp.backend.dto.response.UserSummaryResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    @Override
    public Page<UserSummaryResponse> getAllUserSummaryPages(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToSummary);
    }

    @Override
    public Page<UserSummaryResponse> getUserSummariesByRole(Role role, Pageable pageable) {
        return userRepository.findByRole(role, pageable).map(this::mapToSummary);
    }

    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Override
    public UserSummaryResponse getUserSummaryById(Long id) {
        User user = getUserById(id);
        return mapToSummary(user);
    }

    @Override
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    @Override
    @Transactional
    public UserSummaryResponse updateUser(Long id, UserUpdateRequest request) {
        User existingUser = getUserById(id);

        if (request.getEmail() != null && !request.getEmail().equals(existingUser.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email already in use");
            }
            existingUser.setEmail(request.getEmail());
        }

        if (request.getFirstName() != null) {
            existingUser.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            existingUser.setLastName(request.getLastName());
        }
        if (request.getPhoneNumber() != null) {
            existingUser.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getRole() != null) {
            existingUser.setRole(request.getRole());
        }
        if (request.getEnabled() != null) {
            existingUser.setEnabled(request.getEnabled());
        }

        userRepository.save(existingUser);
        return mapToSummary(existingUser);
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User user = getUserById(id);
        userRepository.delete(user);
    }

    @Override
    @Transactional
    public UserSummaryResponse createUser(RegisterRequest request, Role role) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .role(role)
                .enabled(true)
                .build();

        User saved = userRepository.save(user);
        return mapToSummary(saved);
    }

    @Override
    public List<UserSummaryResponse> getAllUserSummaries() {
        return userRepository.findAll().stream()
                .map(this::mapToSummary)
                .toList();
    }

    private UserSummaryResponse mapToSummary(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRole().name(),
                user.getPhoneNumber(),
                user.getEnabled()
        );
    }
}
