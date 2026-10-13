package com.busgo.service;

import com.busgo.dto.*;
import com.busgo.entity.*;
import com.busgo.exception.BadRequestException;
import com.busgo.exception.ConflictException;
import com.busgo.exception.ResourceNotFoundException;
import com.busgo.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    private final BusRepository busRepository;
    private final BusSeatRepository busSeatRepository;
    private final RouteRepository routeRepository;
    private final DriverRepository driverRepository;
    private final ScheduleRepository scheduleRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PaymentRepository paymentRepository;
    private final CancellationRefundRepository cancellationRefundRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final DriverNotificationDispatcherService dispatcherService;

    public AdminService(BusRepository busRepository,
                        BusSeatRepository busSeatRepository,
                        RouteRepository routeRepository,
                        DriverRepository driverRepository,
                        ScheduleRepository scheduleRepository,
                        BookingRepository bookingRepository,
                        BookingSeatRepository bookingSeatRepository,
                        PaymentRepository paymentRepository,
                        CancellationRefundRepository cancellationRefundRepository,
                        NotificationLogRepository notificationLogRepository,
                        DriverNotificationDispatcherService dispatcherService) {
        this.busRepository = busRepository;
        this.busSeatRepository = busSeatRepository;
        this.routeRepository = routeRepository;
        this.driverRepository = driverRepository;
        this.scheduleRepository = scheduleRepository;
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.paymentRepository = paymentRepository;
        this.cancellationRefundRepository = cancellationRefundRepository;
        this.notificationLogRepository = notificationLogRepository;
        this.dispatcherService = dispatcherService;
    }

    @Transactional(readOnly = true)
    public AdminDashboardMetricsDto getDashboardMetrics() {
        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDate today = LocalDate.now(istZone);
        OffsetDateTime now = OffsetDateTime.now(istZone);

        AdminDashboardMetricsDto metrics = new AdminDashboardMetricsDto();
        metrics.setTotalActiveBuses(busRepository.countByActiveTrue());

        List<Schedule> activeSchedules = scheduleRepository.findByStatusOrderByDepartureTimeDesc(ScheduleStatus.ACTIVE);
        long upcoming = activeSchedules.stream().filter(s -> s.getDepartureTime().isAfter(now)).count();
        metrics.setTotalUpcomingTrips(upcoming);

        metrics.setTodayBookingsCount(bookingRepository.countByBookingStatusAndDate(BookingStatus.CONFIRMED, today));
        metrics.setConfirmedBookingsCount(bookingRepository.countByBookingStatus(BookingStatus.CONFIRMED));
        metrics.setCancelledBookingsCount(bookingRepository.countByBookingStatus(BookingStatus.CANCELLED));

        BigDecimal gross = paymentRepository.calculateGrossCollectedAmount();
        BigDecimal refunds = cancellationRefundRepository.calculateTotalProcessedRefunds();
        metrics.setGrossRevenue(gross);
        metrics.setRefundedRevenue(refunds);
        metrics.setNetRevenue(gross.subtract(refunds));

        metrics.setPendingRefundsCount(cancellationRefundRepository.countPendingRefunds());
        metrics.setPendingNotificationsCount(notificationLogRepository.countPendingNotifications());
        metrics.setFailedNotificationsCount(notificationLogRepository.countFailedNotifications());
        metrics.setTotalNotificationsDispatched(notificationLogRepository.count());

        return metrics;
    }

    // Bus Management
    @Transactional(readOnly = true)
    public List<BusDto> getAllBuses() {
        return busRepository.findAll().stream().map(this::mapBusToDto).collect(Collectors.toList());
    }

    @Transactional
    public BusDto createBus(CreateBusRequest request) {
        if (busRepository.existsByRegistrationNumber(request.getRegistrationNumber().trim())) {
            throw new ConflictException("Bus with registration " + request.getRegistrationNumber() + " already exists.");
        }

        Bus bus = new Bus(
                request.getBusName().trim(),
                request.getRegistrationNumber().trim(),
                request.getBusType().trim(),
                request.getTotalSeats(),
                request.getLayoutType() != null ? request.getLayoutType() : "2+2_SEATER",
                request.getAmenities() != null ? request.getAmenities() : "AC,GPS"
        );
        bus.setActive(request.getActive() != null ? request.getActive() : true);
        Bus savedBus = busRepository.save(bus);

        // Auto-generate standard seats for the bus
        generateSeatsForBus(savedBus);

        return mapBusToDto(savedBus);
    }

    @Transactional
    public BusDto toggleBusActive(Long busId) {
        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id: " + busId));
        bus.setActive(!bus.isActive());
        return mapBusToDto(busRepository.save(bus));
    }

    private void generateSeatsForBus(Bus bus) {
        int total = bus.getTotalSeats();
        String layout = bus.getLayoutType();

        if ("2+1_SLEEPER".equalsIgnoreCase(layout)) {
            int berthsPerDeck = total / 2;
            int rows = (int) Math.ceil((double) berthsPerDeck / 3);
            int count = 1;
            for (int r = 1; r <= rows && count <= berthsPerDeck; r++) {
                busSeatRepository.save(new BusSeat(bus, "L" + count++, SeatType.SLEEPER_LOWER, SeatDeck.LOWER, r, 1));
                if (count <= berthsPerDeck) busSeatRepository.save(new BusSeat(bus, "L" + count++, SeatType.SLEEPER_LOWER, SeatDeck.LOWER, r, 3));
                if (count <= berthsPerDeck) busSeatRepository.save(new BusSeat(bus, "L" + count++, SeatType.SLEEPER_LOWER, SeatDeck.LOWER, r, 4));
            }
            count = 1;
            for (int r = 1; r <= rows && count <= berthsPerDeck; r++) {
                busSeatRepository.save(new BusSeat(bus, "U" + count++, SeatType.SLEEPER_UPPER, SeatDeck.UPPER, r, 1));
                if (count <= berthsPerDeck) busSeatRepository.save(new BusSeat(bus, "U" + count++, SeatType.SLEEPER_UPPER, SeatDeck.UPPER, r, 3));
                if (count <= berthsPerDeck) busSeatRepository.save(new BusSeat(bus, "U" + count++, SeatType.SLEEPER_UPPER, SeatDeck.UPPER, r, 4));
            }
        } else {
            // Default 2+2 seater
            int rows = (int) Math.ceil((double) total / 4);
            int count = 1;
            for (int r = 1; r <= rows && count <= total; r++) {
                for (int c = 1; c <= 4 && count <= total; c++) {
                    busSeatRepository.save(new BusSeat(bus, "S" + count++, SeatType.SEATER, SeatDeck.LOWER, r, c));
                }
            }
        }
    }

    // Route Management
    @Transactional(readOnly = true)
    public List<RouteDto> getAllRoutes() {
        return routeRepository.findAll().stream().map(this::mapRouteToDto).collect(Collectors.toList());
    }

    @Transactional
    public RouteDto createRoute(CreateRouteRequest request) {
        if (request.getOriginCity().trim().equalsIgnoreCase(request.getDestinationCity().trim())) {
            throw new BadRequestException("Origin and Destination cannot be the same city.");
        }

        Route route = new Route(
                request.getOriginCity().trim(),
                request.getDestinationCity().trim(),
                request.getBoardingPoint().trim(),
                request.getDroppingPoint().trim(),
                request.getDistanceKm(),
                request.getEstimatedDurationMinutes()
        );
        route.setActive(request.getActive() != null ? request.getActive() : true);
        return mapRouteToDto(routeRepository.save(route));
    }

    @Transactional
    public RouteDto toggleRouteActive(Long routeId) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + routeId));
        route.setActive(!route.isActive());
        return mapRouteToDto(routeRepository.save(route));
    }

    // Driver Management
    @Transactional(readOnly = true)
    public List<DriverDto> getAllDrivers() {
        return driverRepository.findAll().stream().map(this::mapDriverToDto).collect(Collectors.toList());
    }

    @Transactional
    public DriverDto createDriver(CreateDriverRequest request) {
        if (driverRepository.existsByLicenseNumber(request.getLicenseNumber().trim())) {
            throw new ConflictException("Driver with license number " + request.getLicenseNumber() + " already exists.");
        }

        Driver driver = new Driver(
                request.getDriverName().trim(),
                request.getPhoneNumber().trim(),
                request.getWhatsappNumber().trim(),
                request.getLicenseNumber().trim()
        );
        driver.setActive(request.getActive() != null ? request.getActive() : true);
        return mapDriverToDto(driverRepository.save(driver));
    }

    @Transactional
    public DriverDto toggleDriverActive(Long driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + driverId));
        driver.setActive(!driver.isActive());
        return mapDriverToDto(driverRepository.save(driver));
    }

    // Schedule Management
    @Transactional(readOnly = true)
    public List<ScheduleDto> getAllSchedules() {
        return scheduleRepository.findAll().stream().map(this::mapScheduleToDto).collect(Collectors.toList());
    }

    @Transactional
    public ScheduleDto createSchedule(CreateScheduleRequest request) {
        Bus bus = busRepository.findById(request.getBusId())
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found: " + request.getBusId()));
        Route route = routeRepository.findById(request.getRouteId())
                .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + request.getRouteId()));

        Driver driver = null;
        if (request.getDriverId() != null) {
            driver = driverRepository.findById(request.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + request.getDriverId()));
        }

        if (request.getArrivalTime().isBefore(request.getDepartureTime()) || request.getArrivalTime().isEqual(request.getDepartureTime())) {
            throw new BadRequestException("Arrival time must be strictly after departure time.");
        }

        // Prevent overlapping trips for the same bus!
        List<Schedule> overlaps = scheduleRepository.findOverlappingSchedules(
                bus.getId(), null, request.getDepartureTime(), request.getArrivalTime());
        if (!overlaps.isEmpty()) {
            Schedule conf = overlaps.get(0);
            throw new ConflictException("Scheduling conflict: Bus " + bus.getRegistrationNumber() +
                    " is already assigned to a trip from " + conf.getDepartureTime() + " to " + conf.getArrivalTime());
        }

        Schedule schedule = new Schedule(
                bus,
                route,
                driver,
                request.getJourneyDate(),
                request.getDepartureTime(),
                request.getArrivalTime(),
                request.getBaseFare()
        );
        schedule.setStatus(ScheduleStatus.ACTIVE);
        return mapScheduleToDto(scheduleRepository.save(schedule));
    }

    @Transactional
    public ScheduleDto cancelSchedule(Long scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found: " + scheduleId));
        schedule.setStatus(ScheduleStatus.CANCELLED);
        return mapScheduleToDto(scheduleRepository.save(schedule));
    }

    // Bookings & Payments
    @Transactional(readOnly = true)
    public Page<BookingResponseDto> getAllBookings(Pageable pageable) {
        return bookingRepository.findAllByOrderByCreatedAtDesc(pageable).map(b -> {
            BookingResponseDto dto = new BookingResponseDto();
            dto.setId(b.getId());
            dto.setBookingReference(b.getBookingReference());
            dto.setBookingStatus(b.getBookingStatus());
            dto.setTotalSeats(b.getTotalSeats());
            dto.setTotalAmount(b.getTotalAmount());
            dto.setCreatedAt(b.getCreatedAt());
            dto.setCancellationReason(b.getCancellationReason());
            dto.setCancelledAt(b.getCancelledAt());
            if (b.getUser() != null) {
                dto.setContactEmail(b.getUser().getEmail());
                dto.setContactPhone(b.getUser().getPhoneNumber());
            }
            if (b.getSchedule() != null) {
                dto.setScheduleId(b.getSchedule().getId());
                dto.setJourneyDate(b.getSchedule().getJourneyDate());
                dto.setDepartureTime(b.getSchedule().getDepartureTime());
                dto.setArrivalTime(b.getSchedule().getArrivalTime());
                if (b.getSchedule().getRoute() != null) {
                    dto.setOriginCity(b.getSchedule().getRoute().getOriginCity());
                    dto.setDestinationCity(b.getSchedule().getRoute().getDestinationCity());
                }
                if (b.getSchedule().getBus() != null) {
                    dto.setBusName(b.getSchedule().getBus().getBusName());
                    dto.setRegistrationNumber(b.getSchedule().getBus().getRegistrationNumber());
                    dto.setBusType(b.getSchedule().getBus().getBusType());
                }
            }
            List<String> seats = b.getPassengers() != null && !b.getPassengers().isEmpty()
                    ? b.getPassengers().stream().map(BookingPassenger::getSeatNumber).collect(Collectors.toList())
                    : (b.getBookedSeats() != null
                        ? b.getBookedSeats().stream().map(bs -> bs.getSeat() != null ? bs.getSeat().getSeatNumber() : "").filter(s -> !s.isEmpty()).collect(Collectors.toList())
                        : new ArrayList<>());
            dto.setSeatNumbers(seats);
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllPayments(Pageable pageable) {
        return paymentRepository.findAllByOrderByCreatedAtDesc(pageable).map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("paymentId", p.getPaymentTransactionId() != null ? p.getPaymentTransactionId() : p.getPaymentOrderId());
            m.put("bookingReference", p.getBooking() != null ? p.getBooking().getBookingReference() : "--");
            m.put("gateway", p.getProvider() != null ? p.getProvider().name() : "DEMO");
            m.put("paymentGateway", p.getProvider() != null ? p.getProvider().name() : "DEMO");
            m.put("gatewayOrderId", p.getPaymentOrderId());
            m.put("orderId", p.getPaymentOrderId());
            m.put("paymentOrderId", p.getPaymentOrderId());
            m.put("amount", p.getAmount());
            m.put("paymentStatus", p.getPaymentStatus() != null ? p.getPaymentStatus().name() : "PENDING");
            m.put("status", p.getPaymentStatus() != null ? p.getPaymentStatus().name() : "PENDING");
            m.put("paidAt", p.getUpdatedAt());
            m.put("createdAt", p.getCreatedAt());
            return m;
        });
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllRefunds(Pageable pageable) {
        return cancellationRefundRepository.findAllByOrderByCreatedAtDesc(pageable).map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("cancellationReference", r.getCancellationReference());
            m.put("bookingReference", r.getBooking() != null ? r.getBooking().getBookingReference() : "--");
            m.put("originalAmount", r.getBooking() != null ? r.getBooking().getTotalAmount() : r.getRefundAmount().add(r.getCancellationCharge()));
            m.put("totalAmount", r.getBooking() != null ? r.getBooking().getTotalAmount() : r.getRefundAmount().add(r.getCancellationCharge()));
            m.put("refundAmount", r.getRefundAmount());
            m.put("cancellationFee", r.getCancellationCharge());
            m.put("cancellationCharge", r.getCancellationCharge());
            m.put("refundStatus", r.getRefundStatus() != null ? r.getRefundStatus().name() : "PENDING");
            m.put("status", r.getRefundStatus() != null ? r.getRefundStatus().name() : "PENDING");
            m.put("reason", r.getReason());
            m.put("cancellationReason", r.getReason());
            m.put("createdAt", r.getCreatedAt());
            return m;
        });
    }

    @Transactional
    public void processRefund(Long refundId, User admin) {
        CancellationRefund refund = cancellationRefundRepository.findById(refundId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund record not found: " + refundId));

        refund.setRefundStatus(RefundStatus.PROCESSED);
        refund.setProcessedByUser(admin);
        cancellationRefundRepository.save(refund);

        if (refund.getPayment() != null) {
            refund.getPayment().setPaymentStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(refund.getPayment());
        }

        log.info("Refund {} marked as PROCESSED by Admin {}", refund.getCancellationReference(), admin.getEmail());
    }

    // Notification Logs & Resend
    @Transactional(readOnly = true)
    public Page<NotificationLogDto> getAllNotifications(Pageable pageable) {
        return notificationLogRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::mapNotificationToDto);
    }

    @Transactional
    public NotificationLogDto manualResendNotification(Long notificationId) {
        NotificationLog existing = notificationLogRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification record not found: " + notificationId));

        Schedule schedule = existing.getSchedule();
        String resendKey = "MANUAL_RESEND_SCHED_" + schedule.getId() + "_" + System.currentTimeMillis();

        NotificationLog newLog = dispatcherService.dispatchManifestForSchedule(
                schedule, NotificationType.MANUAL_RESEND, resendKey);

        return mapNotificationToDto(newLog != null ? newLog : existing);
    }

    // Reports
    @Transactional(readOnly = true)
    public ReportSummaryDto getReportSummary() {
        ReportSummaryDto dto = new ReportSummaryDto();

        BigDecimal gross = paymentRepository.calculateGrossCollectedAmount();
        BigDecimal refunds = cancellationRefundRepository.calculateTotalProcessedRefunds();
        dto.setGrossCollections(gross);
        dto.setTotalRefunds(refunds);
        dto.setNetCollections(gross.subtract(refunds));

        dto.setTotalConfirmedBookings(bookingRepository.countByBookingStatus(BookingStatus.CONFIRMED));
        dto.setTotalCancelledBookings(bookingRepository.countByBookingStatus(BookingStatus.CANCELLED));

        // Route-wise stats
        List<Route> routes = routeRepository.findAll();
        List<Map<String, Object>> routeSummaries = new ArrayList<>();
        for (Route r : routes) {
            Map<String, Object> map = new HashMap<>();
            map.put("route", r.getOriginCity() + " \u2192 " + r.getDestinationCity());
            map.put("distanceKm", r.getDistanceKm());
            map.put("active", r.isActive());
            routeSummaries.add(map);
        }
        dto.setRouteWiseSummary(routeSummaries);

        return dto;
    }

    private BusDto mapBusToDto(Bus bus) {
        BusDto d = new BusDto();
        d.setId(bus.getId());
        d.setBusName(bus.getBusName());
        d.setRegistrationNumber(bus.getRegistrationNumber());
        d.setBusType(bus.getBusType());
        d.setTotalSeats(bus.getTotalSeats());
        d.setLayoutType(bus.getLayoutType());
        d.setAmenities(bus.getAmenities());
        d.setActive(bus.isActive());
        return d;
    }

    private RouteDto mapRouteToDto(Route route) {
        RouteDto d = new RouteDto();
        d.setId(route.getId());
        d.setOriginCity(route.getOriginCity());
        d.setDestinationCity(route.getDestinationCity());
        d.setBoardingPoint(route.getBoardingPoint());
        d.setDroppingPoint(route.getDroppingPoint());
        d.setDistanceKm(route.getDistanceKm());
        d.setEstimatedDurationMinutes(route.getEstimatedDurationMinutes());
        d.setActive(route.isActive());

        List<Schedule> schedules = scheduleRepository.findActiveSchedulesByRouteId(route.getId());
        if (!schedules.isEmpty()) {
            Schedule lowest = schedules.get(0);
            d.setBaseFare(lowest.getBaseFare());
            if (lowest.getBus() != null) {
                d.setBusType(lowest.getBus().getBusType());
                d.setLayoutType(lowest.getBus().getLayoutType());
            }
        }
        return d;
    }

    private DriverDto mapDriverToDto(Driver driver) {
        DriverDto d = new DriverDto();
        d.setId(driver.getId());
        d.setDriverName(driver.getDriverName());
        d.setPhoneNumber(driver.getPhoneNumber());
        d.setWhatsappNumber(driver.getWhatsappNumber());
        d.setLicenseNumber(driver.getLicenseNumber());
        d.setActive(driver.isActive());
        return d;
    }

    private ScheduleDto mapScheduleToDto(Schedule s) {
        ScheduleDto d = new ScheduleDto();
        d.setId(s.getId());
        d.setBusId(s.getBus().getId());
        d.setBusName(s.getBus().getBusName());
        d.setRegistrationNumber(s.getBus().getRegistrationNumber());
        d.setBusType(s.getBus().getBusType());
        d.setRouteId(s.getRoute().getId());
        d.setOriginCity(s.getRoute().getOriginCity());
        d.setDestinationCity(s.getRoute().getDestinationCity());
        d.setBoardingPoint(s.getRoute().getBoardingPoint());
        d.setDroppingPoint(s.getRoute().getDroppingPoint());
        if (s.getDriver() != null) {
            d.setDriverId(s.getDriver().getId());
            d.setDriverName(s.getDriver().getDriverName());
            d.setDriverPhone(s.getDriver().getPhoneNumber());
            d.setDriverWhatsapp(s.getDriver().getWhatsappNumber());
        }
        d.setJourneyDate(s.getJourneyDate());
        d.setDepartureTime(s.getDepartureTime());
        d.setArrivalTime(s.getArrivalTime());
        d.setBaseFare(s.getBaseFare());
        d.setStatus(s.getStatus());
        d.setTotalSeats(s.getBus().getTotalSeats());
        d.setBookedSeatsCount((int) bookingSeatRepository.countConfirmedSeatsForSchedule(s.getId()));
        return d;
    }

    private NotificationLogDto mapNotificationToDto(NotificationLog n) {
        NotificationLogDto d = new NotificationLogDto();
        d.setId(n.getId());
        d.setScheduleId(n.getSchedule().getId());
        d.setRouteInfo(n.getSchedule().getRoute().getOriginCity() + " \u2192 " + n.getSchedule().getRoute().getDestinationCity());
        d.setBusRegNumber(n.getSchedule().getBus().getRegistrationNumber());
        d.setDriverId(n.getDriver().getId());
        d.setDriverName(n.getDriver().getDriverName());
        d.setRecipientPhone(n.getRecipientPhone());
        d.setNotificationType(n.getNotificationType());
        d.setProvider(n.getProvider());
        d.setDeliveryStatus(n.getDeliveryStatus());
        d.setMessagePayload(n.getMessagePayload());
        d.setProviderMessageId(n.getProviderMessageId());
        d.setErrorMessage(n.getErrorMessage());
        d.setRetryCount(n.getRetryCount());
        d.setScheduledFor(n.getScheduledFor());
        d.setSentAt(n.getSentAt());
        d.setCreatedAt(n.getCreatedAt());
        return d;
    }
}
