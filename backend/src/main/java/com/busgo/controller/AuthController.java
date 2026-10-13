package com.busgo.controller;

import com.busgo.dto.ApiResponse;
import com.busgo.dto.AuthResponse;
import com.busgo.dto.LoginRequest;
import com.busgo.dto.RegisterRequest;
import com.busgo.dto.UserDto;
import com.busgo.security.UserPrincipal;
import com.busgo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        if (request.getConfirmPassword() == null || request.getConfirmPassword().isBlank()) {
            throw new com.busgo.exception.BadRequestException("Please confirm your password.");
        }
        if (request.getPassword() == null || !request.getPassword().equals(request.getConfirmPassword())) {
            throw new com.busgo.exception.BadRequestException("Passwords do not match. Please make sure both password fields are identical.");
        }
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Registration successful!", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful!", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated."));
        }
        UserDto user = authService.getCurrentUser(principal.getEmail());
        return ResponseEntity.ok(ApiResponse.ok(user));
    }
}
