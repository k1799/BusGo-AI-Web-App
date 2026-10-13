package com.busgo.controller;

import com.busgo.dto.ApiResponse;
import com.busgo.dto.HoldSeatsRequest;
import com.busgo.dto.HoldSeatsResponseDto;
import com.busgo.entity.User;
import com.busgo.repository.UserRepository;
import com.busgo.security.UserPrincipal;
import com.busgo.service.SeatHoldService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/holds")
public class SeatHoldController {

    private final SeatHoldService seatHoldService;
    private final UserRepository userRepository;

    public SeatHoldController(SeatHoldService seatHoldService, UserRepository userRepository) {
        this.seatHoldService = seatHoldService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<HoldSeatsResponseDto>> holdSeats(
            @Valid @RequestBody HoldSeatsRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        HoldSeatsResponseDto response = seatHoldService.holdSeats(request, user);
        return ResponseEntity.ok(ApiResponse.ok("Seats held successfully for checkout.", response));
    }

    @GetMapping("/{holdToken}")
    public ResponseEntity<ApiResponse<HoldSeatsResponseDto>> getHoldStatus(@PathVariable("holdToken") String holdToken) {
        HoldSeatsResponseDto response = seatHoldService.getHoldStatus(holdToken);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping("/{holdToken}")
    public ResponseEntity<ApiResponse<Void>> releaseHold(
            @PathVariable("holdToken") String holdToken,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow();
        seatHoldService.releaseHold(holdToken, user);
        return ResponseEntity.ok(ApiResponse.ok("Seats released successfully.", null));
    }
}
