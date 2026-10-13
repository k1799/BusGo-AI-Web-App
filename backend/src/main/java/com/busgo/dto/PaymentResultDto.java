package com.busgo.dto;

import com.busgo.entity.BookingStatus;
import com.busgo.entity.PaymentStatus;

public class PaymentResultDto {

    private boolean verified;
    private String bookingReference;
    private PaymentStatus paymentStatus;
    private BookingStatus bookingStatus;
    private String message;
    private String transactionId;

    public PaymentResultDto() {}

    public PaymentResultDto(boolean verified, String bookingReference, PaymentStatus paymentStatus, BookingStatus bookingStatus, String message, String transactionId) {
        this.verified = verified;
        this.bookingReference = bookingReference;
        this.paymentStatus = paymentStatus;
        this.bookingStatus = bookingStatus;
        this.message = message;
        this.transactionId = transactionId;
    }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public BookingStatus getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(BookingStatus bookingStatus) { this.bookingStatus = bookingStatus; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
}
