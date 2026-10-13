package com.busgo.repository;

import com.busgo.entity.Booking;
import com.busgo.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingReference(String bookingReference);

    @Query("SELECT b FROM Booking b " +
           "JOIN FETCH b.schedule s " +
           "JOIN FETCH s.bus bus " +
           "JOIN FETCH s.route r " +
           "WHERE b.user.id = :userId " +
           "ORDER BY b.createdAt DESC")
    List<Booking> findByUserIdWithDetails(@Param("userId") Long userId);

    @Query("SELECT b FROM Booking b " +
           "JOIN FETCH b.schedule s " +
           "JOIN FETCH s.bus bus " +
           "JOIN FETCH s.route r " +
           "WHERE b.schedule.id = :scheduleId " +
           "AND b.bookingStatus = 'CONFIRMED'")
    List<Booking> findConfirmedBookingsForSchedule(@Param("scheduleId") Long scheduleId);

    long countByBookingStatus(BookingStatus status);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.bookingStatus = :status AND CAST(b.createdAt AS LocalDate) = :date")
    long countByBookingStatusAndDate(@Param("status") BookingStatus status, @Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM Booking b WHERE b.bookingStatus = 'CONFIRMED'")
    BigDecimal calculateGrossConfirmedRevenue();

    Page<Booking> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
