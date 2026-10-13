package com.busgo.repository;

import com.busgo.entity.CancellationRefund;
import com.busgo.entity.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface CancellationRefundRepository extends JpaRepository<CancellationRefund, Long> {

    Optional<CancellationRefund> findByBookingId(Long bookingId);
    Optional<CancellationRefund> findByCancellationReference(String cancellationReference);

    @Query("SELECT COALESCE(SUM(cr.refundAmount), 0) FROM CancellationRefund cr WHERE cr.refundStatus = 'PROCESSED'")
    BigDecimal calculateTotalProcessedRefunds();

    @Query("SELECT COUNT(cr) FROM CancellationRefund cr WHERE cr.refundStatus = 'PENDING'")
    long countPendingRefunds();

    Page<CancellationRefund> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<CancellationRefund> findByRefundStatusOrderByCreatedAtDesc(RefundStatus status);
}
