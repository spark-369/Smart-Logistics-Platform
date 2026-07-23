package com.slp.backend.service;

import com.slp.backend.dto.request.LoginRequest;
import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
}
