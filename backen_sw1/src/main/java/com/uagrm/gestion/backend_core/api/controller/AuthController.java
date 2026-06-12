package com.uagrm.gestion.backend_core.api.controller;

import com.uagrm.gestion.backend_core.api.dto.AuthResponse;
import com.uagrm.gestion.backend_core.api.dto.LoginRequest;
import com.uagrm.gestion.backend_core.api.dto.RegisterRequest;
import com.uagrm.gestion.backend_core.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
