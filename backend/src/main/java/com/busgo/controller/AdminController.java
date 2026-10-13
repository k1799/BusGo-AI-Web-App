package com.busgo.controller;

import com.busgo.dto.*;
import com.busgo.entity.Booking;
import com.busgo.entity.CancellationRefund;
import com.busgo.entity.Payment;
import com.busgo.entity.User;
import com.busgo.repository.UserRepository;
import com.busgo.security.UserPrincipal;
import com.busgo.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;
    private final com.busgo.service.DriverNotificationDispatcherService dispatcherService;
    private final com.busgo.repository.SeatHoldRepository seatHoldRepository;

    public AdminController(AdminService adminService,
                           UserRepository userRepository,
                           com.busgo.service.DriverNotificationDispatcherService dispatcherService,
                           com.busgo.repository.SeatHoldRepository seatHoldRepository) {
        this.adminService = adminService;
        this.userRepository = userRepository;
        this.dispatcherService = dispatcherService;
        this.seatHoldRepository = seatHoldRepository;
    }

    @GetMapping({"/metrics", "/dashboard"})
    public ResponseEntity<ApiResponse<AdminDashboardMetricsDto>> getDashboardMetrics() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getDashboardMetrics()));
    }

    // Bus Management
    @GetMapping("/buses")
    public ResponseEntity<ApiResponse<List<BusDto>>> getAllBuses() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllBuses()));
    }

    @PostMapping("/buses")
    public ResponseEntity<ApiResponse<BusDto>> createBus(@Valid @RequestBody CreateBusRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Bus created successfully.", adminService.createBus(request)));
    }

    @RequestMapping(value = {"/buses/{id}/toggle", "/buses/{id}"}, method = {RequestMethod.PATCH, RequestMethod.DELETE})
    public ResponseEntity<ApiResponse<BusDto>> toggleBus(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Bus status updated.", adminService.toggleBusActive(id)));
    }

    // Route Management
    @GetMapping("/routes")
    public ResponseEntity<ApiResponse<List<RouteDto>>> getAllRoutes() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllRoutes()));
    }

    @PostMapping("/routes")
    public ResponseEntity<ApiResponse<RouteDto>> createRoute(@Valid @RequestBody CreateRouteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Route created successfully.", adminService.createRoute(request)));
    }

    @RequestMapping(value = {"/routes/{id}/toggle", "/routes/{id}"}, method = {RequestMethod.PATCH, RequestMethod.DELETE})
    public ResponseEntity<ApiResponse<RouteDto>> toggleRoute(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Route status updated.", adminService.toggleRouteActive(id)));
    }

    // Driver Management
    @GetMapping("/drivers")
    public ResponseEntity<ApiResponse<List<DriverDto>>> getAllDrivers() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllDrivers()));
    }

    @PostMapping("/drivers")
    public ResponseEntity<ApiResponse<DriverDto>> createDriver(@Valid @RequestBody CreateDriverRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Driver registered successfully.", adminService.createDriver(request)));
    }

    @RequestMapping(value = {"/drivers/{id}/toggle", "/drivers/{id}"}, method = {RequestMethod.PATCH, RequestMethod.DELETE})
    public ResponseEntity<ApiResponse<DriverDto>> toggleDriver(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Driver status updated.", adminService.toggleDriverActive(id)));
    }

    // Schedule Management
    @GetMapping("/schedules")
    public ResponseEntity<ApiResponse<List<ScheduleDto>>> getAllSchedules() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllSchedules()));
    }

    @PostMapping("/schedules")
    public ResponseEntity<ApiResponse<ScheduleDto>> createSchedule(@Valid @RequestBody CreateScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Schedule created successfully.", adminService.createSchedule(request)));
    }

    @RequestMapping(value = {"/schedules/{id}/cancel", "/schedules/{id}"}, method = {RequestMethod.PATCH, RequestMethod.DELETE})
    public ResponseEntity<ApiResponse<ScheduleDto>> cancelSchedule(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Schedule cancelled.", adminService.cancelSchedule(id)));
    }

    // Bookings
    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<Page<BookingResponseDto>>> getBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllBookings(PageRequest.of(page, size))));
    }

    // Payments & Refunds
    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<Page<java.util.Map<String, Object>>>> getPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllPayments(PageRequest.of(page, size))));
    }

    @GetMapping("/refunds")
    public ResponseEntity<ApiResponse<Page<java.util.Map<String, Object>>>> getRefunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllRefunds(PageRequest.of(page, size))));
    }

    @PostMapping("/refunds/{id}/process")
    public ResponseEntity<ApiResponse<Void>> processRefund(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User admin = userRepository.findById(principal.getId()).orElseThrow();
        adminService.processRefund(id, admin);
        return ResponseEntity.ok(ApiResponse.ok("Refund processed successfully.", null));
    }

    // Notifications
    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<Page<NotificationLogDto>>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllNotifications(PageRequest.of(page, size))));
    }

    @PostMapping("/notifications/{id}/resend")
    public ResponseEntity<ApiResponse<NotificationLogDto>> resendNotification(@PathVariable("id") Long id) {
        NotificationLogDto logDto = adminService.manualResendNotification(id);
        return ResponseEntity.ok(ApiResponse.ok("Notification resend triggered.", logDto));
    }

    @PostMapping("/notifications/dispatch-now")
    public ResponseEntity<ApiResponse<String>> triggerDispatchNow() {
        dispatcherService.dispatchUpcomingTripManifests();
        return ResponseEntity.ok(ApiResponse.ok("Upcoming driver WhatsApp trip manifests dispatch check executed.", "SUCCESS"));
    }

    @PostMapping("/holds/cleanup")
    @ org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<String>> cleanupExpiredHolds() {
        int expired = seatHoldRepository.markExpiredHolds(java.time.OffsetDateTime.now(java.time.ZoneId.of("Asia/Kolkata")));
        return ResponseEntity.ok(ApiResponse.ok("Expired seat holds released (" + expired + " cleared).", "SUCCESS"));
    }

    // Reports
    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<ReportSummaryDto>> getReports() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getReportSummary()));
    }
}
