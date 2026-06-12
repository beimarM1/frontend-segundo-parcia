package com.uagrm.gestion.backend_core.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String id;      // MongoDB _id del usuario (estable entre sesiones)
    private String token;
    private String role;
    private String cargo;
    private String email;
    private String name;
}
