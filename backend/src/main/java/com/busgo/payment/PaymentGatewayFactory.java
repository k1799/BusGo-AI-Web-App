package com.busgo.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PaymentGatewayFactory {

    private final DemoPaymentGatewayService demoPaymentGatewayService;
    private final RazorpayPaymentGatewayService razorpayPaymentGatewayService;
    private final String configuredMode;

    public PaymentGatewayFactory(
            DemoPaymentGatewayService demoPaymentGatewayService,
            RazorpayPaymentGatewayService razorpayPaymentGatewayService,
            @Value("${busgo.payment.mode:DEMO}") String configuredMode) {
        this.demoPaymentGatewayService = demoPaymentGatewayService;
        this.razorpayPaymentGatewayService = razorpayPaymentGatewayService;
        this.configuredMode = configuredMode;
    }

    public PaymentGatewayService getService() {
        if ("RAZORPAY".equalsIgnoreCase(configuredMode)) {
            return razorpayPaymentGatewayService;
        }
        return demoPaymentGatewayService;
    }
}
