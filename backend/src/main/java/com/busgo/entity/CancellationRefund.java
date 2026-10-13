package com.busgo.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cancellations_refunds")
public class CancellationRefund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Column(name = "cancellation_reference", nullable = false, unique = true, length = 50)
    private String cancellationReference;

    @Column(name = "refund_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "cancellation_charge", nullable = false, precision = 10, scale = 2)
    private BigDecimal cancellationCharge = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", nullable = false, length = 30)
    private RefundStatus refundStatus = RefundStatus.PENDING;

    @Column(name = "reason", length = 255)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_user_id")
    private User processedByUser;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public CancellationRefund() {}

    public CancellationRefund(Booking booking, Payment payment, String cancellationReference, BigDecimal refundAmount, BigDecimal cancellationCharge, String reason) {
        this.booking = booking;
        this.payment = payment;
        this.cancellationReference = cancellationReference;
        this.refundAmount = refundAmount;
        this.cancellationCharge = cancellationCharge;
        this.reason = reason;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }

    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }

    public String getCancellationReference() { return cancellationReference; }
    public void setCancellationReference(String cancellationReference) { this.cancellationReference = cancellationReference; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public BigDecimal getCancellationCharge() { return cancellationCharge; }
    public void setCancellationCharge(BigDecimal cancellationCharge) { this.cancellationCharge = cancellationCharge; }

    public RefundStatus getRefundStatus() { return refundStatus; }
    public void setRefundStatus(RefundStatus refundStatus) { this.refundStatus = refundStatus; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public User getProcessedByUser() { return processedByUser; }
    public void setProcessedByUser(User processedByUser) { this.processedByUser = processedByUser; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
