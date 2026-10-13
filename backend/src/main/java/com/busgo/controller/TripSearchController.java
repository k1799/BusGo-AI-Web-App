package com.busgo.controller;

import com.busgo.dto.ApiResponse;
import com.busgo.dto.SeatLayoutDto;
import com.busgo.dto.TripSearchResultDto;
import com.busgo.entity.Route;
import com.busgo.security.UserPrincipal;
import com.busgo.service.TripService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TripSearchController {

    private final TripService tripService;

    public TripSearchController(TripService tripService) {
        this.tripService = tripService;
    }

    @GetMapping("/trips/search")
    public ResponseEntity<ApiResponse<List<TripSearchResultDto>>> searchTrips(
            @RequestParam(value = "origin", required = false) String origin,
            @RequestParam(value = "destination", required = false) String destination,
            @RequestParam(value = "journeyDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate journeyDate,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate effectiveDate = journeyDate != null ? journeyDate : (date != null ? date : LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")));
        List<TripSearchResultDto> trips = tripService.searchTrips(origin != null ? origin : "", destination != null ? destination : "", effectiveDate);
        return ResponseEntity.ok(ApiResponse.ok(trips));
    }

    @GetMapping({"/trips/{scheduleId}/seats", "/schedules/{scheduleId}/seats"})
    public ResponseEntity<ApiResponse<SeatLayoutDto>> getSeatLayout(
            @PathVariable("scheduleId") Long scheduleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long currentUserId = principal != null ? principal.getId() : null;
        SeatLayoutDto layout = tripService.getSeatLayout(scheduleId, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(layout));
    }

    @GetMapping("/routes/cities")
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> getCities() {
        return ResponseEntity.ok(ApiResponse.ok(tripService.getSearchCities()));
    }

    @GetMapping("/routes/popular")
    public ResponseEntity<ApiResponse<List<com.busgo.dto.RouteDto>>> getPopularRoutes() {
        return ResponseEntity.ok(ApiResponse.ok(tripService.getPopularRoutes()));
    }
}
