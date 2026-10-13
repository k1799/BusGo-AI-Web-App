package com.busgo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class PassengerRequestDto {

    private Long seatId;
    private String seatNumber;

    private String passengerName;
    private String name;

    private Integer passengerAge;
    private Integer age;

    private String passengerGender;
    private String gender; // MALE, FEMALE, OTHER

    private String contactNumber;

    public PassengerRequestDto() {}

    public Long getSeatId() { return seatId; }
    public void setSeatId(Long seatId) { this.seatId = seatId; }

    public String getSeatNumber() { return seatNumber; }
    public void setSeatNumber(String seatNumber) { this.seatNumber = seatNumber; }

    public String getPassengerName() { return passengerName != null ? passengerName : name; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }

    public String getName() { return name != null ? name : passengerName; }
    public void setName(String name) { this.name = name; }

    public Integer getPassengerAge() { return passengerAge != null ? passengerAge : age; }
    public void setPassengerAge(Integer passengerAge) { this.passengerAge = passengerAge; }

    public Integer getAge() { return age != null ? age : passengerAge; }
    public void setAge(Integer age) { this.age = age; }

    public String getPassengerGender() { return passengerGender != null ? passengerGender : gender; }
    public void setPassengerGender(String passengerGender) { this.passengerGender = passengerGender; }

    public String getGender() { return gender != null ? gender : passengerGender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }
}
