package com.uagrm.gestion.backend_core.domain.repository;

import com.uagrm.gestion.backend_core.domain.enums.TramiteStatus;
import com.uagrm.gestion.backend_core.domain.model.Tramite;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio para la gestión de trámites y bandejas de trabajo.
 */
@Repository
public interface TramiteRepository extends MongoRepository<Tramite, String> {
    List<Tramite> findByIdUsuarioFinal(String idUsuarioFinal);
    List<Tramite> findByIdFuncionarioAsignadoAndEstadoActual(String idFuncionarioAsignado, TramiteStatus estado);
    List<Tramite> findByCurrentAssignedRoleAndEstadoActual(String currentAssignedRole, TramiteStatus estado);
    List<Tramite> findByEstadoActual(TramiteStatus estado);
}
