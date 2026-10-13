package com.busgo.controller;

import com.busgo.dto.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;
    private final String paymentMode;
    private final String whatsappMode;
    private final String appTimezone;

    public HealthController(
            JdbcTemplate jdbcTemplate,
            @Value("${busgo.payment.mode:DEMO}") String paymentMode,
            @Value("${busgo.whatsapp.mode:MOCK}") String whatsappMode,
            @Value("${busgo.app.timezone:Asia/Kolkata}") String appTimezone) {
        this.jdbcTemplate = jdbcTemplate;
        this.paymentMode = paymentMode;
        this.whatsappMode = whatsappMode;
        this.appTimezone = appTimezone;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("service", "BusGo Backend API");
        status.put("timezone", appTimezone);
        status.put("currentTime", OffsetDateTime.now(ZoneId.of(appTimezone)));
        status.put("paymentProviderMode", paymentMode);
        status.put("whatsappProviderMode", whatsappMode);

        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            status.put("database", "CONNECTED");
        } catch (Exception e) {
            status.put("database", "DISCONNECTED: " + e.getMessage());
            status.put("status", "DEGRADED");
        }

        return ResponseEntity.ok(ApiResponse.ok("BusGo service is healthy", status));
    }
}
