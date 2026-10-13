package com.busgo.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class HoldSeatsRequest {

    @NotNull(message = "Schedule ID is required")
    private Long scheduleId;

    private List<Long> seatIds;
    private List<String> seatNumbers;

    public HoldSeatsRequest() {}

    public HoldSeatsRequest(Long scheduleId, List<Long> seatIds) {
        this.scheduleId = scheduleId;
        this.seatIds = seatIds;
    }

    public Long getScheduleId() { return scheduleId; }
    public void setScheduleId(Long scheduleId) { this.scheduleId = scheduleId; }

    public List<Long> getSeatIds() { return seatIds; }
    public void setSeatIds(List<Long> seatIds) { this.seatIds = seatIds; }

    public List<String> getSeatNumbers() { return seatNumbers; }
    public void setSeatNumbers(List<String> seatNumbers) { this.seatNumbers = seatNumbers; }
}
