package com.busgo.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class HoldSeatsResponseDto {

    private String holdToken;
    private Long scheduleId;
    private OffsetDateTime expiresAt;
    private long remainingSeconds;
    private int seatCount;
    private BigDecimal totalAmount;
    private List<SeatHoldItemDto> heldSeats;

    public HoldSeatsResponseDto() {}

    public String getHoldToken() { return holdToken; }
    public void setHoldToken(String holdToken) { this.holdToken = holdToken; }

    public Long getScheduleId() { return scheduleId; }
    public void setScheduleId(Long scheduleId) { this.scheduleId = scheduleId; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }

    public long getRemainingSeconds() { return remainingSeconds; }
    public void setRemainingSeconds(long remainingSeconds) { this.remainingSeconds = remainingSeconds; }

    public int getSeatCount() { return seatCount; }
    public void setSeatCount(int seatCount) { this.seatCount = seatCount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public List<SeatHoldItemDto> getHeldSeats() { return heldSeats; }
    public void setHeldSeats(List<SeatHoldItemDto> heldSeats) { this.heldSeats = heldSeats; }
}
