package com.uagrm.gestion.backend_core.domain.repository;

import com.uagrm.gestion.backend_core.domain.model.PoliticaReporte;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio MongoDB para la colección 'politica_reportes'.
 */
@Repository
public interface PoliticaReporteRepository extends MongoRepository<PoliticaReporte, String> {

    List<PoliticaReporte> findByGeneradoPorOrderByCreadoEnDesc(String generadoPor);
    List<PoliticaReporte> findByCategoriaOrderByCreadoEnDesc(String categoria);
    List<PoliticaReporte> findByNivelPrioridad(String nivelPrioridad);
}
