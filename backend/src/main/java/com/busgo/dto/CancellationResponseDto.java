package com.busgo.dto;

import com.busgo.entity.RefundStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class CancellationResponseDto {

    private String bookingReference;
    private String cancellationReference;
    private BigDecimal originalAmount;
    private BigDecimal cancellationCharge;
    private BigDecimal refundAmount;
    private RefundStatus refundStatus;
    private String policyApplied;
    private OffsetDateTime cancelledAt;

    public CancellationResponseDto() {}

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public String getCancellationReference() { return cancellationReference; }
    public void setCancellationReference(String cancellationReference) { this.cancellationReference = cancellationReference; }

    public BigDecimal getOriginalAmount() { return originalAmount; }
    public void setOriginalAmount(BigDecimal originalAmount) { this.originalAmount = originalAmount; }

    public BigDecimal getCancellationCharge() { return cancellationCharge; }
    public void setCancellationCharge(BigDecimal cancellationCharge) { this.cancellationCharge = cancellationCharge; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public RefundStatus getRefundStatus() { return refundStatus; }
    public void setRefundStatus(RefundStatus refundStatus) { this.refundStatus = refundStatus; }

    public String getPolicyApplied() { return policyApplied; }
    public void setPolicyApplied(String policyApplied) { this.policyApplied = policyApplied; }

    public OffsetDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(OffsetDateTime cancelledAt) { this.cancelledAt = cancelledAt; }
}
