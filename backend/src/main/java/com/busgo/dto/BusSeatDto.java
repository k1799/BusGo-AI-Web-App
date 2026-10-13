package com.busgo.dto;

import com.busgo.entity.SeatDeck;
import com.busgo.entity.SeatType;

import java.math.BigDecimal;

public class BusSeatDto {

    private Long seatId;
    private String seatNumber;
    private SeatType seatType;
    private SeatDeck deck;
    private int rowNumber;
    private int columnNumber;
    private String status; // AVAILABLE, HELD, BOOKED
    private BigDecimal fare;
    private boolean heldByCurrentUser;

    public BusSeatDto() {}

    public Long getSeatId() { return seatId; }
    public void setSeatId(Long seatId) { this.seatId = seatId; }

    public String getSeatNumber() { return seatNumber; }
    public void setSeatNumber(String seatNumber) { this.seatNumber = seatNumber; }

    public SeatType getSeatType() { return seatType; }
    public void setSeatType(SeatType seatType) { this.seatType = seatType; }

    public SeatDeck getDeck() { return deck; }
    public void setDeck(SeatDeck deck) { this.deck = deck; }

    public int getRowNumber() { return rowNumber; }
    public void setRowNumber(int rowNumber) { this.rowNumber = rowNumber; }

    public int getColumnNumber() { return columnNumber; }
    public void setColumnNumber(int columnNumber) { this.columnNumber = columnNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getFare() { return fare; }
    public void setFare(BigDecimal fare) { this.fare = fare; }

    public boolean isHeldByCurrentUser() { return heldByCurrentUser; }
    public void setHeldByCurrentUser(boolean heldByCurrentUser) { this.heldByCurrentUser = heldByCurrentUser; }
}
