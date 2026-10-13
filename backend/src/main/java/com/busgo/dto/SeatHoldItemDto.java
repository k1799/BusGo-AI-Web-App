package com.busgo.dto;

import java.math.BigDecimal;

public class SeatHoldItemDto {

    private Long seatId;
    private String seatNumber;
    private String seatType;
    private BigDecimal fare;

    public SeatHoldItemDto() {}

    public SeatHoldItemDto(Long seatId, String seatNumber, String seatType, BigDecimal fare) {
        this.seatId = seatId;
        this.seatNumber = seatNumber;
        this.seatType = seatType;
        this.fare = fare;
    }

    public Long getSeatId() { return seatId; }
    public void setSeatId(Long seatId) { this.seatId = seatId; }

    public String getSeatNumber() { return seatNumber; }
    public void setSeatNumber(String seatNumber) { this.seatNumber = seatNumber; }

    public String getSeatType() { return seatType; }
    public void setSeatType(String seatType) { this.seatType = seatType; }

    public BigDecimal getFare() { return fare; }
    public void setFare(BigDecimal fare) { this.fare = fare; }
}
