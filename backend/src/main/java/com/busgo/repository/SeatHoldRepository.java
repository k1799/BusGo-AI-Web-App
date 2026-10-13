package com.busgo.repository;

import com.busgo.entity.HoldStatus;
import com.busgo.entity.SeatHold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface SeatHoldRepository extends JpaRepository<SeatHold, Long> {

    @Query("SELECT sh FROM SeatHold sh " +
           "WHERE sh.schedule.id = :scheduleId " +
           "AND sh.seat.id IN :seatIds " +
           "AND sh.status = 'HELD' " +
           "AND sh.expiresAt > :now")
    List<SeatHold> findActiveHoldsForSeats(
            @Param("scheduleId") Long scheduleId,
            @Param("seatIds") List<Long> seatIds,
            @Param("now") OffsetDateTime now);

    @Query("SELECT sh FROM SeatHold sh " +
           "WHERE sh.schedule.id = :scheduleId " +
           "AND sh.status = 'HELD' " +
           "AND sh.expiresAt > :now")
    List<SeatHold> findActiveHoldsForSchedule(
            @Param("scheduleId") Long scheduleId,
            @Param("now") OffsetDateTime now);

    List<SeatHold> findByHoldTokenAndStatus(String holdToken, HoldStatus status);

    @Query("SELECT sh FROM SeatHold sh WHERE sh.status = 'HELD' AND sh.expiresAt <= :now")
    List<SeatHold> findExpiredHolds(@Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE SeatHold sh SET sh.status = 'EXPIRED' WHERE sh.status = 'HELD' AND sh.expiresAt <= :now")
    int markExpiredHolds(@Param("now") OffsetDateTime now);
}
