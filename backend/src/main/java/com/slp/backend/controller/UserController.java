package com.slp.backend.controller;

import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.request.UserUpdateRequest;
import com.slp.backend.dto.response.ApiResponse;
import com.slp.backend.dto.response.UserSummaryResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User management APIs")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @Operation(summary = "Get all users")
    public ResponseEntity<Page<UserSummaryResponse>> getAllUsers(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUserSummaryPages(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<UserSummaryResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserSummaryById(id));
    }

    @GetMapping("/role/{role}")
    @Operation(summary = "Get users by role")
    public ResponseEntity<Page<UserSummaryResponse>> getUsersByRole(@PathVariable Role role, @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userService.getUserSummariesByRole(role, pageable));
    }

    @GetMapping("/lookup")
    @Operation(summary = "Get all users for dropdowns")
    public ResponseEntity<List<UserSummaryResponse>> getUserLookup() {
        return ResponseEntity.ok(userService.getAllUserSummaries());
    }

    @PostMapping
    @Operation(summary = "Create a new user")
    public ResponseEntity<UserSummaryResponse> createUser(@Valid @RequestBody RegisterRequest request) {
        Role role = request.getRole() != null ? request.getRole() : Role.CUSTOMER;
        UserSummaryResponse response = userService.createUser(request, role);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user")
    public ResponseEntity<UserSummaryResponse> updateUser(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User deleted successfully", null));
    }
}
