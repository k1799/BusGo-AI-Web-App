package com.busgo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "bus_seats", uniqueConstraints = {
    @UniqueConstraint(name = "uq_bus_seat", columnNames = {"bus_id", "seat_number"})
})
public class BusSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id", nullable = false)
    private Bus bus;

    @Column(name = "seat_number", nullable = false, length = 10)
    private String seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", nullable = false, length = 30)
    private SeatType seatType = SeatType.SEATER;

    @Enumerated(EnumType.STRING)
    @Column(name = "deck", nullable = false, length = 20)
    private SeatDeck deck = SeatDeck.LOWER;

    @Column(name = "row_number", nullable = false)
    private int rowNumber;

    @Column(name = "column_number", nullable = false)
    private int columnNumber;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public BusSeat() {}

    public BusSeat(Bus bus, String seatNumber, SeatType seatType, SeatDeck deck, int rowNumber, int columnNumber) {
        this.bus = bus;
        this.seatNumber = seatNumber;
        this.seatType = seatType;
        this.deck = deck;
        this.rowNumber = rowNumber;
        this.columnNumber = columnNumber;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Bus getBus() { return bus; }
    public void setBus(Bus bus) { this.bus = bus; }

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

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
