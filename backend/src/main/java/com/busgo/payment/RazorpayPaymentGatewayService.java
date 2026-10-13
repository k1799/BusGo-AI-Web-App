package com.busgo.payment;

import com.busgo.dto.PaymentOrderDto;
import com.busgo.dto.PaymentVerificationRequest;
import com.busgo.entity.Booking;
import com.busgo.entity.Payment;
import com.busgo.entity.PaymentProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RazorpayPaymentGatewayService implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayPaymentGatewayService.class);

    private final String key;
    private final String secret;

    public RazorpayPaymentGatewayService(
            @Value("${busgo.payment.key:rzp_test_placeholder_key}") String key,
            @Value("${busgo.payment.secret:rzp_test_placeholder_secret}") String secret) {
        this.key = key;
        this.secret = secret;
    }

    @Override
    public PaymentProvider getProvider() {
        return PaymentProvider.RAZORPAY;
    }

    @Override
    public PaymentOrderDto createOrder(Booking booking, Payment payment) {
        String orderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        payment.setPaymentOrderId(orderId);

        log.info("[RAZORPAY] Generated order ID: {} for booking: {}", orderId, booking.getBookingReference());

        PaymentOrderDto dto = new PaymentOrderDto();
        dto.setBookingReference(booking.getBookingReference());
        dto.setPaymentOrderId(orderId);
        dto.setAmount(booking.getTotalAmount());
        dto.setCurrency("INR");
        dto.setProvider("RAZORPAY");
        dto.setProviderKey(key);
        dto.setCustomerName(booking.getUser().getFullName());
        dto.setCustomerEmail(booking.getUser().getEmail());
        dto.setCustomerPhone(booking.getUser().getPhoneNumber());
        dto.setDescription("BusGo Booking " + booking.getBookingReference());

        return dto;
    }

    @Override
    public boolean verifySignature(PaymentVerificationRequest request, Payment payment) {
        if (request.getProviderSignature() == null || request.getPaymentTransactionId() == null) {
            log.warn("[RAZORPAY] Missing transaction ID or signature in verification request.");
            return false;
        }

        try {
            String payload = payment.getPaymentOrderId() + "|" + request.getPaymentTransactionId();
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = HexFormat.of().formatHex(hash);

            boolean matches = expectedSignature.equalsIgnoreCase(request.getProviderSignature());
            if (!matches) {
                log.warn("[RAZORPAY] Signature mismatch for order: {}. Expected: {}, Received: {}",
                        payment.getPaymentOrderId(), expectedSignature, request.getProviderSignature());
            }
            return matches;
        } catch (Exception e) {
            log.error("[RAZORPAY] Signature calculation failed: {}", e.getMessage());
            return false;
        }
    }
}
