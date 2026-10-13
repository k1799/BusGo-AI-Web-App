package com.busgo.service;

import com.busgo.dto.AuthResponse;
import com.busgo.dto.LoginRequest;
import com.busgo.dto.RegisterRequest;
import com.busgo.dto.UserDto;
import com.busgo.entity.Role;
import com.busgo.entity.User;
import com.busgo.exception.ConflictException;
import com.busgo.exception.ResourceNotFoundException;
import com.busgo.repository.UserRepository;
import com.busgo.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getFullName() == null || request.getFullName().trim().length() < 2) {
            throw new com.busgo.exception.BadRequestException("Full name must be at least 2 characters.");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new com.busgo.exception.BadRequestException("Valid email address is required.");
        }
        String rawPhone = request.getPhoneNumber();
        if (rawPhone == null || rawPhone.isBlank()) {
            throw new com.busgo.exception.BadRequestException("Phone number is required.");
        }
        String cleanedPhone = rawPhone.trim().replaceAll("[\\s\\-]", "");
        if (!cleanedPhone.matches("^(\\+91)?[0]?[6789]\\d{9}$")) {
            throw new com.busgo.exception.BadRequestException("Please enter a valid 10-digit Indian mobile number.");
        }
        String tenDigit = cleanedPhone.substring(cleanedPhone.length() - 10);
        String canonicalPhone = "+91" + tenDigit;

        if (request.getPassword() == null || request.getPassword().length() < 6 || request.getPassword().length() > 50) {
            throw new com.busgo.exception.BadRequestException("Password must be between 6 and 50 characters.");
        }
        if (request.getConfirmPassword() != null && !request.getPassword().equals(request.getConfirmPassword())) {
            throw new com.busgo.exception.BadRequestException("Passwords do not match. Please make sure both password fields are identical.");
        }

        if (userRepository.existsByPhoneVariants(cleanedPhone, canonicalPhone, tenDigit)) {
            throw new ConflictException("This phone number is already registered. Please log in or use another number.");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with email " + email + " already exists.");
        }

        // Strictly register as ROLE_CUSTOMER (customers cannot self-assign ADMIN role)
        User user = new User(
                request.getFullName().trim(),
                email,
                canonicalPhone,
                passwordEncoder.encode(request.getPassword()),
                Role.ROLE_CUSTOMER
        );

        User savedUser = userRepository.save(user);

        // Generate JWT token directly
        String token = tokenProvider.generateTokenForUser(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getRole().name()
        );

        UserDto userDto = new UserDto(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getPhoneNumber(),
                savedUser.getRole()
        );

        return new AuthResponse(token, userDto);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        String token = tokenProvider.generateToken(authentication);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));

        UserDto userDto = new UserDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getRole()
        );

        return new AuthResponse(token, userDto);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getPhoneNumber(), user.getRole());
    }
}
