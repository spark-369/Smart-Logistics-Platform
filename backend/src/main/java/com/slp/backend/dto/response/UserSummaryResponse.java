package com.slp.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserSummaryResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private String phoneNumber;
    private Boolean enabled;
}