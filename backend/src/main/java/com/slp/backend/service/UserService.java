package com.slp.backend.service;

import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.request.UserUpdateRequest;
import com.slp.backend.dto.response.UserSummaryResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    Page<User> getAllUsers(Pageable pageable);
    Page<UserSummaryResponse> getAllUserSummaryPages(Pageable pageable);
    Page<UserSummaryResponse> getUserSummariesByRole(Role role, Pageable pageable);
    User getUserById(Long id);
    UserSummaryResponse getUserSummaryById(Long id);
    User getUserByEmail(String email);
    UserSummaryResponse updateUser(Long id, UserUpdateRequest request);
    void deleteUser(Long id);
    UserSummaryResponse createUser(RegisterRequest request, Role role);
    List<UserSummaryResponse> getAllUserSummaries();
}
