package com.slp.backend.controller;

import com.slp.backend.dto.request.RegisterRequest;
import com.slp.backend.dto.request.UserUpdateRequest;
import com.slp.backend.dto.response.ApiResponse;
import com.slp.backend.dto.response.UserSummaryResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.service.UserService;
import com.slp.backend.util.CurrentUserUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User administration.
 *
 * <p>Every mutating endpoint and the full listing are restricted to ADMIN. The only endpoint open
 * to all authenticated users is {@code /lookup}, which returns the minimal projection required to
 * populate sender/receiver dropdowns when booking a shipment.
 */
@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User management APIs")
public class UserController {

    private final UserService userService;
    private final CurrentUserUtil currentUserUtil;

    public UserController(UserService userService, CurrentUserUtil currentUserUtil) {
        this.userService = userService;
        this.currentUserUtil = currentUserUtil;
    }

    @GetMapping
    @Operation(summary = "Get all users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserSummaryResponse>> getAllUsers(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUserSummaryPages(pageable));
    }

    @GetMapping("/lookup")
    @Operation(summary = "Get all users for dropdowns (any authenticated user)")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UserSummaryResponse>> getUserLookup() {
        return ResponseEntity.ok(userService.getAllUserSummaries());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserSummaryResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserSummaryById(id));
    }

    @GetMapping("/role/{role}")
    @Operation(summary = "Get users by role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserSummaryResponse>> getUsersByRole(@PathVariable Role role,
                                                                    @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(userService.getUserSummariesByRole(role, pageable));
    }

    @PostMapping
    @Operation(summary = "Create a new user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserSummaryResponse> createUser(@Valid @RequestBody RegisterRequest request) {
        Role role = request.getRole() != null ? request.getRole() : Role.CUSTOMER;
        UserSummaryResponse response = userService.createUser(request, role);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserSummaryResponse> updateUser(@PathVariable Long id,
                                                          @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        // Guard against an administrator locking themselves out of the platform.
        var currentUser = currentUserUtil.getCurrentUser();
        if (currentUser != null && currentUser.getId().equals(id)) {
            throw new BadRequestException("You cannot delete your own account");
        }
        userService.deleteUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User deleted successfully", null));
    }
}
