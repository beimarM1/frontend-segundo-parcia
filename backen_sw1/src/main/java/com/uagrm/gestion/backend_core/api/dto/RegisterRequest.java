package com.uagrm.gestion.backend_core.api.dto;

import com.uagrm.gestion.backend_core.domain.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private UserRole role;
    private String cargo;
}
