package com.busgo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email address is required")
    private String email;

    @Pattern(regexp = "^(\\+91[\\-\\s]?)?[0]?[6789]\\d{9}$", message = "Valid Indian mobile number is required")
    private String phoneNumber;

    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 50, message = "Password must be at least 6 characters")
    private String password;

    private String confirmPassword;

    public RegisterRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() {
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            return phoneNumber.trim().replaceAll("[\\s\\-]", "");
        }
        if (phone != null && !phone.isBlank()) {
            return phone.trim().replaceAll("[\\s\\-]", "");
        }
        return phoneNumber;
    }
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber != null ? phoneNumber.trim().replaceAll("[\\s\\-]", "") : null;
    }

    public String getPhone() { return getPhoneNumber(); }
    public void setPhone(String phone) {
        this.phone = phone != null ? phone.trim().replaceAll("[\\s\\-]", "") : null;
        if (this.phoneNumber == null || this.phoneNumber.isBlank()) {
            this.phoneNumber = this.phone;
        }
    }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
}
