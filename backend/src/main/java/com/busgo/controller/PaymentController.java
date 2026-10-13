package com.busgo.controller;

import com.busgo.dto.*;
import com.busgo.entity.User;
import com.busgo.repository.UserRepository;
import com.busgo.security.UserPrincipal;
import com.busgo.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    public PaymentController(BookingService bookingService, UserRepository userRepository) {
        this.bookingService = bookingService;
        this.userRepository = userRepository;
    }

    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<PaymentOrderDto>> createOrder(
            @Valid @RequestBody com.busgo.dto.CreatePaymentOrderRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        com.busgo.dto.PaymentOrderDto orderDto = bookingService.createPaymentOrder(request, user);
        return ResponseEntity.ok(ApiResponse.ok("Payment order initiated.", orderDto));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<PaymentResultDto>> verifyPayment(
            @Valid @RequestBody PaymentVerificationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        PaymentResultDto result = bookingService.verifyPayment(request, user);
        return ResponseEntity.ok(ApiResponse.ok(result.getMessage(), result));
    }
}
