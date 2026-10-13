package com.busgo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public class DigitalTicketDto {

    private String bookingReference;
    private String bookingStatus;
    private String paymentStatus;
    private String paymentTransactionId;

    private String customerName;
    private String customerEmail;
    private String customerPhone;

    private String busName;
    private String registrationNumber;
    private String busType;

    private String originCity;
    private String destinationCity;
    private String boardingPoint;
    private String droppingPoint;

    private LocalDate journeyDate;
    private OffsetDateTime departureTime;
    private OffsetDateTime arrivalTime;
    private int estimatedDurationMinutes;

    private int totalSeats;
    private BigDecimal baseFare;
    private BigDecimal totalAmount;

    private List<PassengerDetailDto> passengers;
    private List<String> seatNumbers;

    private String driverName;
    private String driverPhone;
    private String driverNotificationStatus;
    private String paymentGateway;

    private String qrCodeData;
    private OffsetDateTime issuedAt;

    public DigitalTicketDto() {}

    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }

    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getBusName() { return busName; }
    public void setBusName(String busName) { this.busName = busName; }

    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }

    public String getBusType() { return busType; }
    public void setBusType(String busType) { this.busType = busType; }

    public String getOriginCity() { return originCity; }
    public void setOriginCity(String originCity) { this.originCity = originCity; }

    public String getDestinationCity() { return destinationCity; }
    public void setDestinationCity(String destinationCity) { this.destinationCity = destinationCity; }

    public String getBoardingPoint() { return boardingPoint; }
    public void setBoardingPoint(String boardingPoint) { this.boardingPoint = boardingPoint; }

    public String getDroppingPoint() { return droppingPoint; }
    public void setDroppingPoint(String droppingPoint) { this.droppingPoint = droppingPoint; }

    public LocalDate getJourneyDate() { return journeyDate; }
    public void setJourneyDate(LocalDate journeyDate) { this.journeyDate = journeyDate; }

    public OffsetDateTime getDepartureTime() { return departureTime; }
    public void setDepartureTime(OffsetDateTime departureTime) { this.departureTime = departureTime; }

    public OffsetDateTime getArrivalTime() { return arrivalTime; }
    public void setArrivalTime(OffsetDateTime arrivalTime) { this.arrivalTime = arrivalTime; }

    public int getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(int estimatedDurationMinutes) { this.estimatedDurationMinutes = estimatedDurationMinutes; }

    public int getTotalSeats() { return totalSeats; }
    public void setTotalSeats(int totalSeats) { this.totalSeats = totalSeats; }

    public BigDecimal getBaseFare() { return baseFare; }
    public void setBaseFare(BigDecimal baseFare) { this.baseFare = baseFare; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public List<PassengerDetailDto> getPassengers() { return passengers; }
    public void setPassengers(List<PassengerDetailDto> passengers) { this.passengers = passengers; }

    public List<String> getSeatNumbers() { return seatNumbers; }
    public void setSeatNumbers(List<String> seatNumbers) { this.seatNumbers = seatNumbers; }

    public String getQrCodeData() { return qrCodeData; }
    public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }

    public OffsetDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(OffsetDateTime issuedAt) { this.issuedAt = issuedAt; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getDriverPhone() { return driverPhone; }
    public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }

    public String getDriverNotificationStatus() { return driverNotificationStatus; }
    public void setDriverNotificationStatus(String driverNotificationStatus) { this.driverNotificationStatus = driverNotificationStatus; }

    public String getPaymentGateway() { return paymentGateway; }
    public void setPaymentGateway(String paymentGateway) { this.paymentGateway = paymentGateway; }

    public String getStatus() { return bookingStatus; }
    public void setStatus(String status) { this.bookingStatus = status; }

    public OffsetDateTime getCreatedAt() { return issuedAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.issuedAt = createdAt; }

    public String getQrCodePayload() { return qrCodeData; }
    public void setQrCodePayload(String qrCodePayload) { this.qrCodeData = qrCodePayload; }

    public String getPaymentId() { return paymentTransactionId; }
    public void setPaymentId(String paymentId) { this.paymentTransactionId = paymentId; }
}
