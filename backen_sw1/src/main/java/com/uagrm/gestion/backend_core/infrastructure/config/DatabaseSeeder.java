package com.uagrm.gestion.backend_core.infrastructure.config;

import com.uagrm.gestion.backend_core.domain.enums.UserRole;
import com.uagrm.gestion.backend_core.domain.model.User;
import com.uagrm.gestion.backend_core.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder; // <-- IMPORTANTE IMPORTAR ESTO
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder; // <-- INYECTAMOS EL ENCRIPTADOR DE STRINGS

    @Override
    public void run(String... args) throws Exception {
        // Solo inyectamos datos si la colección de usuarios está vacía
        if (userRepository.count() == 0) {
            log.info("Base de datos vacía detectada. Inyectando usuarios de prueba...");

            User admin = User.builder()
                    .id("u_admin_001")
                    .name("Beimar Mamani") 
                    .email("diseñador_politicas@uagrm.edu.bo") // <-- CORREO ÚNICO ASIGNADO
                    .password(passwordEncoder.encode("control123")) // <-- CLAVE ENCRIPTADA DE PRUEBA
                    .role(UserRole.DISEÑADOR_POLITICAS) 
                    .build();

            User funcionario = User.builder()
                    .id("u_func_002")
                    .name("Secretaría FICCT")
                    .email("secretaria_ficct@uagrm.edu.bo") // <-- CORREO ÚNICO ASIGNADO
                    .password(passwordEncoder.encode("control123"))
                    .role(UserRole.FUNCIONARIO)
                    .build();

            User solicitante = User.builder()
                    .id("u_user_003")
                    .name("Estudiante Base")
                    .email("estudiante@uagrm.edu.bo") // <-- CORREO ÚNICO ASIGNADO
                    .password(passwordEncoder.encode("control123"))
                    .role(UserRole.USUARIO_FINAL)
                    .build();

            // Guardamos los 3 en MongoDB limpios y con datos completos
            userRepository.saveAll(java.util.List.of(admin, funcionario, solicitante));
            
            log.info("¡Usuarios de prueba inyectados con éxito!");
        } else {
            log.info("La base de datos ya tiene usuarios. Se omite la inyección.");
        }
    }
}