package com.busgo.repository;

import com.busgo.entity.Schedule;
import com.busgo.entity.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    @Query("SELECT s FROM Schedule s " +
           "JOIN FETCH s.bus b " +
           "JOIN FETCH s.route r " +
           "LEFT JOIN FETCH s.driver d " +
           "WHERE LOWER(r.originCity) = LOWER(:origin) " +
           "AND LOWER(r.destinationCity) = LOWER(:destination) " +
           "AND s.journeyDate = :journeyDate " +
           "AND s.status = :status " +
           "AND b.active = true " +
           "AND r.active = true " +
           "AND s.departureTime > :now " +
           "ORDER BY s.departureTime ASC")
    List<Schedule> searchActiveTrips(
            @Param("origin") String origin,
            @Param("destination") String destination,
            @Param("journeyDate") LocalDate journeyDate,
            @Param("status") ScheduleStatus status,
            @Param("now") OffsetDateTime now);

    @Query("SELECT s FROM Schedule s " +
           "WHERE s.bus.id = :busId " +
           "AND s.status = 'ACTIVE' " +
           "AND (:id IS NULL OR s.id <> :id) " +
           "AND ((s.departureTime <= :arr AND s.arrivalTime >= :dep))")
    List<Schedule> findOverlappingSchedules(
            @Param("busId") Long busId,
            @Param("id") Long currentScheduleId,
            @Param("dep") OffsetDateTime departureTime,
            @Param("arr") OffsetDateTime arrivalTime);

    @Query("SELECT s FROM Schedule s " +
           "JOIN FETCH s.bus b " +
           "JOIN FETCH s.route r " +
           "JOIN FETCH s.driver d " +
           "WHERE s.status = 'ACTIVE' " +
           "AND s.departureTime >= :windowStart " +
           "AND s.departureTime <= :windowEnd " +
           "AND d.active = true")
    List<Schedule> findSchedulesForDriverNotification(
            @Param("windowStart") OffsetDateTime windowStart,
            @Param("windowEnd") OffsetDateTime windowEnd);

    @Query("SELECT s FROM Schedule s " +
           "JOIN FETCH s.bus b " +
           "WHERE s.route.id = :routeId " +
           "AND s.status = 'ACTIVE' " +
           "ORDER BY s.baseFare ASC, s.departureTime ASC")
    List<Schedule> findActiveSchedulesByRouteId(@Param("routeId") Long routeId);

    List<Schedule> findByJourneyDateAndStatus(LocalDate journeyDate, ScheduleStatus status);
    List<Schedule> findByStatusOrderByDepartureTimeDesc(ScheduleStatus status);
    long countByStatus(ScheduleStatus status);
}
