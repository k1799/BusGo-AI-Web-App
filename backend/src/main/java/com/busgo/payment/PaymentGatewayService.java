package com.busgo.payment;

import com.busgo.dto.PaymentOrderDto;
import com.busgo.dto.PaymentVerificationRequest;
import com.busgo.entity.Booking;
import com.busgo.entity.Payment;
import com.busgo.entity.PaymentProvider;

public interface PaymentGatewayService {
    PaymentProvider getProvider();
    PaymentOrderDto createOrder(Booking booking, Payment payment);
    boolean verifySignature(PaymentVerificationRequest request, Payment payment);
}
