package com.busgo.dto;

import jakarta.validation.constraints.NotBlank;

public class PaymentVerificationRequest {

    private String bookingReference;
    private String paymentOrderId;
    private String orderId;
    private String paymentId;
    private String signature;
    private String paymentTransactionId;
    private String providerSignature;
    private String status; // SUCCESS or FAILED
    private String failureReason;

    public PaymentVerificationRequest() {}

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public String getPaymentOrderId() {
        return paymentOrderId != null && !paymentOrderId.isBlank() ? paymentOrderId : orderId;
    }
    public void setPaymentOrderId(String paymentOrderId) { this.paymentOrderId = paymentOrderId; }

    public String getOrderId() { return getPaymentOrderId(); }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getPaymentTransactionId() {
        return paymentTransactionId != null && !paymentTransactionId.isBlank() ? paymentTransactionId : paymentId;
    }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }

    public String getPaymentId() { return getPaymentTransactionId(); }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }

    public String getProviderSignature() {
        return providerSignature != null && !providerSignature.isBlank() ? providerSignature : signature;
    }
    public void setProviderSignature(String providerSignature) { this.providerSignature = providerSignature; }

    public String getSignature() { return getProviderSignature(); }
    public void setSignature(String signature) { this.signature = signature; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
}
