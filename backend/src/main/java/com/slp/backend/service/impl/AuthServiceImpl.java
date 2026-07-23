package com.slp.backend.service.impl;

import com.slp.backend.dto.request.LoginRequest;
import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.response.AuthResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.service.AuthService;
import com.slp.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        if (request.getRole() == Role.ADMIN) {
            throw new BadRequestException("Cannot self-register as ADMIN");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phoneNumber(request.getPhoneNumber())
                .role(request.getRole() != null ? request.getRole() : Role.CUSTOMER)
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);

        String token = jwtUtil.generateToken(savedUser.getEmail());
        return new AuthResponse(
                token,
                "Bearer",
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getFirstName(),
                savedUser.getLastName(),
                savedUser.getRole().name(),
                savedUser.getPhoneNumber()
        );
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            throw new UnauthorizedException("Invalid email or password");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getEnabled()) {
            throw new UnauthorizedException("Account is disabled");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name(),
                user.getPhoneNumber()
        );
    }
}
