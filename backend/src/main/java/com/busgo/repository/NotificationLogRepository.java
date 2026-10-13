package com.busgo.repository;

import com.busgo.entity.DeliveryStatus;
import com.busgo.entity.NotificationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {

    Optional<NotificationLog> findByIdempotencyKey(String idempotencyKey);
    boolean existsByIdempotencyKey(String idempotencyKey);

    List<NotificationLog> findByScheduleIdOrderByCreatedAtDesc(Long scheduleId);

    Page<NotificationLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COUNT(n) FROM NotificationLog n WHERE n.deliveryStatus = 'FAILED'")
    long countFailedNotifications();

    @Query("SELECT COUNT(n) FROM NotificationLog n WHERE n.deliveryStatus = 'PENDING'")
    long countPendingNotifications();

    List<NotificationLog> findByDeliveryStatus(DeliveryStatus status);
}
