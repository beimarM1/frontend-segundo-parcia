package com.uagrm.gestion.backend_core.service;

import com.uagrm.gestion.backend_core.api.dto.AuthResponse;
import com.uagrm.gestion.backend_core.api.dto.LoginRequest;
import com.uagrm.gestion.backend_core.api.dto.RegisterRequest;
import com.uagrm.gestion.backend_core.domain.enums.UserRole;
import com.uagrm.gestion.backend_core.domain.model.User;
import com.uagrm.gestion.backend_core.domain.repository.UserRepository;
import com.uagrm.gestion.backend_core.infrastructure.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;

        public AuthResponse register(RegisterRequest request) {
                User user = User.builder()
                                .name(request.getName())
                                .email(request.getEmail())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(request.getRole() != null ? request.getRole() : UserRole.CLIENTE_MOVIL)
                                .cargo(request.getCargo())
                                .active(true)
                                .build();

                userRepository.save(user);
                String jwtToken = jwtService.generateToken(user);
                return AuthResponse.builder()
                                .id(user.getId())
                                .token(jwtToken)
                                .role(user.getRole().name())
                                .cargo(user.getCargo())
                                .email(user.getEmail())
                                .name(user.getName())
                                .build();
        }

        public AuthResponse login(LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getEmail(),
                                                request.getPassword()));

                User user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow();

                String jwtToken = jwtService.generateToken(user);

                return AuthResponse.builder()
                                .id(user.getId())
                                .token(jwtToken)
                                .role(user.getRole().name())
                                .cargo(user.getCargo())
                                .email(user.getEmail())
                                .name(user.getName())
                                .build();
        }
}
