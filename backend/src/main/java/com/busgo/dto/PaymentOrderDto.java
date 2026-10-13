package com.busgo.dto;

import java.math.BigDecimal;

public class PaymentOrderDto {

    private String bookingReference;
    private String paymentOrderId;
    private BigDecimal amount;
    private String currency;
    private String provider; // DEMO or RAZORPAY
    private String providerKey;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String description;

    public PaymentOrderDto() {}

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public String getPaymentOrderId() { return paymentOrderId; }
    public void setPaymentOrderId(String paymentOrderId) { this.paymentOrderId = paymentOrderId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getProviderKey() { return providerKey; }
    public void setProviderKey(String providerKey) { this.providerKey = providerKey; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getOrderId() { return paymentOrderId; }
    public void setOrderId(String orderId) { this.paymentOrderId = orderId; }

    public String getPaymentId() { return paymentOrderId != null ? "PAY_" + paymentOrderId : "PAY_DEMO"; }
    public void setPaymentId(String paymentId) { }

    public String getSignature() { return "demo_signature"; }
    public void setSignature(String signature) { }
}
