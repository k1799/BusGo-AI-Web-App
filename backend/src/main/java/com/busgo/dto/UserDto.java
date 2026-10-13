package com.busgo.dto;

import com.busgo.entity.Role;

public class UserDto {

    private Long id;
    private String fullName;
    private String email;
    private String phoneNumber;
    private Role role;

    public UserDto() {}

    public UserDto(Long id, String fullName, String email, String phoneNumber, Role role) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Long getUserId() { return id; }
    public String getPhone() { return phoneNumber; }
}
