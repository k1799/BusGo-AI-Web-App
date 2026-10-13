package com.busgo.payment;

import com.busgo.dto.PaymentOrderDto;
import com.busgo.dto.PaymentVerificationRequest;
import com.busgo.entity.Booking;
import com.busgo.entity.Payment;
import com.busgo.entity.PaymentProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class DemoPaymentGatewayService implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(DemoPaymentGatewayService.class);

    @Override
    public PaymentProvider getProvider() {
        return PaymentProvider.DEMO;
    }

    @Override
    public PaymentOrderDto createOrder(Booking booking, Payment payment) {
        String orderId = "DEMO_ORDER_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
        payment.setPaymentOrderId(orderId);

        log.info("[DEMO PAYMENT MODE] Created simulated payment order: {} for booking: {} (Amount: INR {})",
                orderId, booking.getBookingReference(), booking.getTotalAmount());

        PaymentOrderDto dto = new PaymentOrderDto();
        dto.setBookingReference(booking.getBookingReference());
        dto.setPaymentOrderId(orderId);
        dto.setAmount(booking.getTotalAmount());
        dto.setCurrency("INR");
        dto.setProvider("DEMO");
        dto.setProviderKey("DEMO_SANDBOX_KEY_BUSGO");
        dto.setCustomerName(booking.getUser().getFullName());
        dto.setCustomerEmail(booking.getUser().getEmail());
        dto.setCustomerPhone(booking.getUser().getPhoneNumber());
        dto.setDescription("BusGo Booking " + booking.getBookingReference() + " [DEMO SIMULATION]");

        return dto;
    }

    @Override
    public boolean verifySignature(PaymentVerificationRequest request, Payment payment) {
        // In demo mode, verify that order ID matches and payment status submitted is SUCCESS
        if (request.getPaymentOrderId() == null || !request.getPaymentOrderId().equals(payment.getPaymentOrderId())) {
            log.warn("[DEMO PAYMENT] Order ID mismatch. Expected: {}, Received: {}",
                    payment.getPaymentOrderId(), request.getPaymentOrderId());
            return false;
        }

        if ("FAILED".equalsIgnoreCase(request.getStatus())) {
            log.info("[DEMO PAYMENT] Client reported payment failed for order: {}", request.getPaymentOrderId());
            return false;
        }

        log.info("[DEMO PAYMENT] Verified simulated payment success for order: {}", request.getPaymentOrderId());
        return true;
    }
}
