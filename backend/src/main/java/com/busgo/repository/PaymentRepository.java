package com.busgo.repository;

import com.busgo.entity.Payment;
import com.busgo.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByPaymentOrderId(String paymentOrderId);

    Optional<Payment> findByBookingId(Long bookingId);

    List<Payment> findByBookingIdOrderByCreatedAtDesc(Long bookingId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.paymentStatus = 'SUCCESS'")
    BigDecimal calculateGrossCollectedAmount();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.paymentStatus = 'REFUNDED'")
    BigDecimal calculateTotalRefundedAmount();

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Payment> findByPaymentStatusOrderByCreatedAtDesc(PaymentStatus status);
}
