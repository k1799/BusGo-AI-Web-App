package com.busgo.repository;

import com.busgo.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {
    List<Route> findByActiveTrue();
    
    @Query("SELECT r FROM Route r WHERE LOWER(r.originCity) = LOWER(:origin) AND LOWER(r.destinationCity) = LOWER(:destination) AND r.active = true")
    List<Route> findRoutes(String origin, String destination);

    @Query("SELECT DISTINCT r.originCity FROM Route r WHERE r.active = true ORDER BY r.originCity")
    List<String> findDistinctOriginCities();

    @Query("SELECT DISTINCT r.destinationCity FROM Route r WHERE r.active = true ORDER BY r.destinationCity")
    List<String> findDistinctDestinationCities();

    Optional<Route> findByOriginCityAndDestinationCityAndBoardingPointAndDroppingPoint(
            String originCity, String destinationCity, String boardingPoint, String droppingPoint);
}
