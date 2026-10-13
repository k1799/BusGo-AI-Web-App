package com.busgo.dto;

import jakarta.validation.constraints.NotBlank;

public class CreatePaymentOrderRequest {

    @NotBlank(message = "Booking reference is required")
    private String bookingReference;

    private String paymentProvider; // DEMO, RAZORPAY

    public CreatePaymentOrderRequest() {}

    public CreatePaymentOrderRequest(String bookingReference, String paymentProvider) {
        this.bookingReference = bookingReference;
        this.paymentProvider = paymentProvider;
    }

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public String getPaymentProvider() { return paymentProvider; }
    public void setPaymentProvider(String paymentProvider) { this.paymentProvider = paymentProvider; }
}
