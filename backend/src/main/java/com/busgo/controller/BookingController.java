package com.busgo.controller;

import com.busgo.dto.*;
import com.busgo.entity.User;
import com.busgo.repository.UserRepository;
import com.busgo.security.UserPrincipal;
import com.busgo.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    public BookingController(BookingService bookingService, UserRepository userRepository) {
        this.bookingService = bookingService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponseDto>> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        BookingResponseDto response = bookingService.createBooking(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Booking initiated. Please complete payment.", response));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<BookingResponseDto>>> getMyBookings(@AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        List<BookingResponseDto> bookings = bookingService.getCustomerBookings(user);
        return ResponseEntity.ok(ApiResponse.ok(bookings));
    }

    @GetMapping("/{reference}/ticket")
    public ResponseEntity<ApiResponse<DigitalTicketDto>> getDigitalTicket(
            @PathVariable("reference") String reference,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        DigitalTicketDto ticket = bookingService.getDigitalTicket(reference, user);
        return ResponseEntity.ok(ApiResponse.ok(ticket));
    }

    @PostMapping("/{reference}/cancel")
    public ResponseEntity<ApiResponse<CancellationResponseDto>> cancelBooking(
            @PathVariable("reference") String reference,
            @Valid @RequestBody CancelBookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        CancellationResponseDto response = bookingService.cancelBooking(reference, request, user);
        return ResponseEntity.ok(ApiResponse.ok("Booking cancelled successfully.", response));
    }
}
