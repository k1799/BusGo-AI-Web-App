package com.busgo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateDriverRequest {

    @NotBlank(message = "Driver name is required")
    private String driverName;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^(\\+91[\\-\\s]?)?[0]?[6789]\\d{9}$", message = "Valid Indian phone number is required")
    private String phoneNumber;

    @NotBlank(message = "WhatsApp number is required")
    @Pattern(regexp = "^(\\+91[\\-\\s]?)?[0]?[6789]\\d{9}$", message = "Valid Indian WhatsApp number is required")
    private String whatsappNumber;

    @NotBlank(message = "License number is required")
    private String licenseNumber;

    private Boolean active = true;

    public CreateDriverRequest() {}

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }
    public void setFullName(String fullName) {
        if (this.driverName == null || this.driverName.isBlank()) {
            this.driverName = fullName;
        }
    }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getWhatsappNumber() { return whatsappNumber; }
    public void setWhatsappNumber(String whatsappNumber) { this.whatsappNumber = whatsappNumber; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
