package com.busgo.dto;

public class AuthResponse {

    private String token;
    private String tokenType = "Bearer";
    private UserDto user;

    public AuthResponse() {}

    public AuthResponse(String token, UserDto user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getAccessToken() { return token; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public Long getUserId() { return user != null ? user.getId() : null; }
    public String getFullName() { return user != null ? user.getFullName() : null; }
    public String getEmail() { return user != null ? user.getEmail() : null; }
    public String getPhoneNumber() { return user != null ? user.getPhoneNumber() : null; }
    public String getPhone() { return user != null ? user.getPhoneNumber() : null; }
    public String getRole() { return user != null && user.getRole() != null ? user.getRole().name() : null; }
}
