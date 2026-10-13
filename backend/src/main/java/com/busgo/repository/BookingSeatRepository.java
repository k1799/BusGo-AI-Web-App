package com.busgo.repository;

import com.busgo.entity.BookingSeat;
import com.busgo.entity.BookingSeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByBookingId(Long bookingId);

    List<BookingSeat> findByScheduleIdAndStatus(Long scheduleId, BookingSeatStatus status);

    boolean existsByScheduleIdAndSeatIdAndStatus(Long scheduleId, Long seatId, BookingSeatStatus status);

    @Query("SELECT bs.seat.id FROM BookingSeat bs WHERE bs.schedule.id = :scheduleId AND bs.status = 'CONFIRMED'")
    List<Long> findConfirmedSeatIdsForSchedule(@Param("scheduleId") Long scheduleId);

    @Query("SELECT COUNT(bs) FROM BookingSeat bs WHERE bs.schedule.id = :scheduleId AND bs.status = 'CONFIRMED'")
    long countConfirmedSeatsForSchedule(@Param("scheduleId") Long scheduleId);
}
