package com.busgo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CancelBookingRequest {

    @NotBlank(message = "Cancellation reason is required")
    @Size(min = 3, max = 250, message = "Reason must be between 3 and 250 characters")
    private String reason;

    public CancelBookingRequest() {}

    public CancelBookingRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
