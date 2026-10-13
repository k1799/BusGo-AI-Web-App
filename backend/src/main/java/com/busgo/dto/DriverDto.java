package com.busgo.dto;

public class DriverDto {

    private Long id;
    private String driverName;
    private String phoneNumber;
    private String whatsappNumber;
    private String licenseNumber;
    private boolean active;

    public DriverDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getWhatsappNumber() { return whatsappNumber; }
    public void setWhatsappNumber(String whatsappNumber) { this.whatsappNumber = whatsappNumber; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean getIsActive() { return active; }
    public String getFullName() { return driverName; }
    public String getPhone() { return phoneNumber; }
}
