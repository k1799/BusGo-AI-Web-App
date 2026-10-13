package com.busgo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CreateBookingRequest {

    @NotNull(message = "Schedule ID is required")
    private Long scheduleId;

    @NotBlank(message = "Hold token is required")
    private String holdToken;

    @NotEmpty(message = "Passenger details are required")
    @Size(min = 1, max = 6, message = "Between 1 and 6 passengers can be booked")
    @Valid
    private List<PassengerRequestDto> passengers;

    private String contactEmail;
    private String contactPhone;

    public CreateBookingRequest() {}

    public Long getScheduleId() { return scheduleId; }
    public void setScheduleId(Long scheduleId) { this.scheduleId = scheduleId; }

    public String getHoldToken() { return holdToken; }
    public void setHoldToken(String holdToken) { this.holdToken = holdToken; }

    public List<PassengerRequestDto> getPassengers() { return passengers; }
    public void setPassengers(List<PassengerRequestDto> passengers) { this.passengers = passengers; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
}
