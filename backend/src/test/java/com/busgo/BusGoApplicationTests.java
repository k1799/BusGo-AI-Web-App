package com.busgo;

import com.busgo.dto.*;
import com.busgo.entity.*;
import com.busgo.exception.BadRequestException;
import com.busgo.exception.ConflictException;
import com.busgo.repository.*;
import com.busgo.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
class BusGoApplicationTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private TripService tripService;

    @Autowired
    private SeatHoldService seatHoldService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private DriverNotificationDispatcherService dispatcherService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusRepository busRepository;

    @Autowired
    private BusSeatRepository busSeatRepository;

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationLogRepository notificationLogRepository;

    @Autowired
    private BookingPassengerRepository passengerRepository;

    @Autowired
    private BookingSeatRepository bookingSeatRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private CancellationRefundRepository cancellationRefundRepository;

    @Autowired
    private SeatHoldRepository seatHoldRepository;

    private User testCustomer;
    private Schedule testSchedule;
    private List<BusSeat> testSeats;

    @BeforeEach
    void setUp() {
        notificationLogRepository.deleteAll();
        cancellationRefundRepository.deleteAll();
        paymentRepository.deleteAll();
        passengerRepository.deleteAll();
        bookingSeatRepository.deleteAll();
        bookingRepository.deleteAll();
        seatHoldRepository.deleteAll();
        scheduleRepository.deleteAll();
        busSeatRepository.deleteAll();
        busRepository.deleteAll();
        routeRepository.deleteAll();
        driverRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Create Customer
        RegisterRequest regReq = new RegisterRequest();
        regReq.setFullName("Test Traveler");
        regReq.setEmail("traveler@test.com");
        regReq.setPhoneNumber("+919876500000");
        regReq.setPassword("Password@123");
        AuthResponse authRes = authService.register(regReq);
        assertNotNull(authRes.getToken());
        assertEquals(Role.ROLE_CUSTOMER, authRes.getUser().getRole());
        testCustomer = userRepository.findByEmail("traveler@test.com").orElseThrow();

        // 2. Create Bus
        Bus bus = new Bus("BusGo Royal Sleeper", "TN-58-BG-1001", "AC Sleeper (2+1)", 6, "2+1_SLEEPER", "AC,GPS");
        bus = busRepository.save(bus);

        // Create 6 seats
        for (int i = 1; i <= 6; i++) {
            BusSeat seat = new BusSeat(bus, "L" + i, SeatType.SLEEPER_LOWER, SeatDeck.LOWER, i, 1);
            busSeatRepository.save(seat);
        }
        testSeats = busSeatRepository.findByBusIdAndActiveTrueOrderByRowNumberAscColumnNumberAsc(bus.getId());

        // 3. Create Route
        Route route = new Route("Madurai", "Chennai", "Mattuthavani BS", "Kilambakkam BS", new BigDecimal("460.00"), 480);
        route = routeRepository.save(route);

        // 4. Create Driver
        Driver driver = new Driver("Murugan K", "+919876543210", "+919876543210", "DL-TN58-20150001234");
        driver = driverRepository.save(driver);

        // 5. Create Schedule for tomorrow
        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDate tomorrow = LocalDate.now(istZone).plusDays(1);
        OffsetDateTime dep = tomorrow.atTime(21, 0).atZone(istZone).toOffsetDateTime();
        OffsetDateTime arr = tomorrow.plusDays(1).atTime(5, 0).atZone(istZone).toOffsetDateTime();

        Schedule schedule = new Schedule(bus, route, driver, tomorrow, dep, arr, new BigDecimal("950.00"));
        testSchedule = scheduleRepository.save(schedule);
    }

    @Test
    void testCustomerRegistrationAndLogin() {
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("traveler@test.com");
        loginReq.setPassword("Password@123");
        AuthResponse loginRes = authService.login(loginReq);

        assertNotNull(loginRes.getToken());
        assertEquals("traveler@test.com", loginRes.getUser().getEmail());
        assertEquals(Role.ROLE_CUSTOMER, loginRes.getUser().getRole());
    }

    @Test
    void testTripSearchAndValidation() {
        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDate tomorrow = LocalDate.now(istZone).plusDays(1);

        // Valid search
        List<TripSearchResultDto> results = tripService.searchTrips("Madurai", "Chennai", tomorrow);
        assertFalse(results.isEmpty());
        assertEquals("TN-58-BG-1001", results.get(0).getRegistrationNumber());
        assertEquals(new BigDecimal("950.00"), results.get(0).getBaseFare());
        assertEquals(6, results.get(0).getAvailableSeats());

        // Reject past date
        LocalDate pastDate = LocalDate.now(istZone).minusDays(1);
        assertThrows(BadRequestException.class, () -> tripService.searchTrips("Madurai", "Chennai", pastDate));

        // Reject identical cities
        assertThrows(BadRequestException.class, () -> tripService.searchTrips("Madurai", "Madurai", tomorrow));
    }

    @Test
    void testSeatHoldingAndDoubleHoldConflictPrevention() {
        Long seatId1 = testSeats.get(0).getId();
        Long seatId2 = testSeats.get(1).getId();

        HoldSeatsRequest holdReq = new HoldSeatsRequest(testSchedule.getId(), List.of(seatId1, seatId2));
        HoldSeatsResponseDto holdRes = seatHoldService.holdSeats(holdReq, testCustomer);

        assertNotNull(holdRes.getHoldToken());
        assertEquals(2, holdRes.getSeatCount());
        assertEquals(new BigDecimal("1900.00"), holdRes.getTotalAmount()); // 2 * 950

        // Create second user
        RegisterRequest regReq2 = new RegisterRequest();
        regReq2.setFullName("Second User");
        regReq2.setEmail("second@test.com");
        regReq2.setPhoneNumber("+919876500001");
        regReq2.setPassword("Password@123");
        authService.register(regReq2);
        User secondUser = userRepository.findByEmail("second@test.com").orElseThrow();

        // Attempting to hold the same seat must throw ConflictException!
        HoldSeatsRequest conflictReq = new HoldSeatsRequest(testSchedule.getId(), List.of(seatId1));
        assertThrows(ConflictException.class, () -> seatHoldService.holdSeats(conflictReq, secondUser));
    }

    @Test
    void testEndToEndBookingPaymentAndCancellation() {
        Long seatId = testSeats.get(0).getId();
        HoldSeatsRequest holdReq = new HoldSeatsRequest(testSchedule.getId(), List.of(seatId));
        HoldSeatsResponseDto holdRes = seatHoldService.holdSeats(holdReq, testCustomer);

        // Create Booking
        PassengerRequestDto pReq = new PassengerRequestDto();
        pReq.setSeatId(seatId);
        pReq.setPassengerName("Ravi Kumar");
        pReq.setPassengerAge(30);
        pReq.setPassengerGender("MALE");

        CreateBookingRequest bookReq = new CreateBookingRequest();
        bookReq.setScheduleId(testSchedule.getId());
        bookReq.setHoldToken(holdRes.getHoldToken());
        bookReq.setPassengers(List.of(pReq));

        BookingResponseDto bookingRes = bookingService.createBooking(bookReq, testCustomer);
        assertNotNull(bookingRes.getBookingReference());
        assertEquals(BookingStatus.PENDING_PAYMENT, bookingRes.getBookingStatus());
        assertEquals(new BigDecimal("950.00"), bookingRes.getTotalAmount());
        assertNotNull(bookingRes.getPaymentOrderId());

        // Verify Payment
        PaymentVerificationRequest payVerify = new PaymentVerificationRequest();
        payVerify.setBookingReference(bookingRes.getBookingReference());
        payVerify.setPaymentOrderId(bookingRes.getPaymentOrderId());
        payVerify.setStatus("SUCCESS");

        PaymentResultDto payResult = bookingService.verifyPayment(payVerify, testCustomer);
        assertTrue(payResult.isVerified());
        assertEquals(BookingStatus.CONFIRMED, payResult.getBookingStatus());

        // Digital Ticket verification
        DigitalTicketDto ticket = bookingService.getDigitalTicket(bookingRes.getBookingReference(), testCustomer);
        assertEquals(bookingRes.getBookingReference(), ticket.getBookingReference());
        assertTrue(ticket.getQrCodeData().contains(bookingRes.getBookingReference()));

        // Cancellation with refund calculation
        CancelBookingRequest cancelReq = new CancelBookingRequest("Plan changed");
        CancellationResponseDto cancelRes = bookingService.cancelBooking(bookingRes.getBookingReference(), cancelReq, testCustomer);

        assertNotNull(cancelRes.getCancellationReference());
        assertEquals(new BigDecimal("950.00"), cancelRes.getOriginalAmount());
        // Since departure is tomorrow (> 24 hours), refund is 90% = 855.00, charge is 10% = 95.00
        assertEquals(new BigDecimal("855.00"), cancelRes.getRefundAmount());
        assertEquals(new BigDecimal("95.00"), cancelRes.getCancellationCharge());
    }

    @Test
    void testScheduleConflictPrevention() {
        // Attempting to create an overlapping schedule for the same bus
        CreateScheduleRequest req = new CreateScheduleRequest();
        req.setBusId(testSchedule.getBus().getId());
        req.setRouteId(testSchedule.getRoute().getId());
        req.setJourneyDate(testSchedule.getJourneyDate());
        req.setDepartureTime(testSchedule.getDepartureTime().plusHours(1));
        req.setArrivalTime(testSchedule.getArrivalTime().plusHours(1));
        req.setBaseFare(new BigDecimal("800.00"));

        assertThrows(ConflictException.class, () -> adminService.createSchedule(req));
    }

    @Test
    void testDriverWhatsAppNotificationIdempotency() {
        String key = "MANIFEST_10MIN_SCHED_" + testSchedule.getId();

        // First dispatch
        NotificationLog log1 = dispatcherService.dispatchManifestForSchedule(testSchedule, NotificationType.TRIP_MANIFEST_10MIN, key);
        assertNotNull(log1);
        assertEquals(DeliveryStatus.SENT, log1.getDeliveryStatus());

        // Check duplicate prevention
        assertTrue(notificationLogRepository.existsByIdempotencyKey(key));
    }

    @Test
    void testPopularRoutesIncludeGenuineBaseFare() {
        List<RouteDto> popular = tripService.getPopularRoutes();
        assertFalse(popular.isEmpty());
        RouteDto first = popular.get(0);
        assertEquals("Madurai", first.getOriginCity());
        assertEquals("Chennai", first.getDestinationCity());
        assertEquals(new BigDecimal("950.00"), first.getBaseFare());
        assertEquals("AC Sleeper (2+1)", first.getBusType());
    }

    @Test
    void testDuplicatePhoneAndConfirmPasswordValidation() {
        // 1. Duplicate phone number without +91 prefix (matches existing +919876500000)
        RegisterRequest dupPhoneReq = new RegisterRequest();
        dupPhoneReq.setFullName("Another Traveler");
        dupPhoneReq.setEmail("another@test.com");
        dupPhoneReq.setPhoneNumber("9876500000");
        dupPhoneReq.setPassword("Password@123");
        dupPhoneReq.setConfirmPassword("Password@123");

        ConflictException conflictEx = assertThrows(ConflictException.class, () -> authService.register(dupPhoneReq));
        assertEquals("This phone number is already registered. Please log in or use another number.", conflictEx.getMessage());

        // 2. Password and Confirm Password mismatch
        RegisterRequest mismatchReq = new RegisterRequest();
        mismatchReq.setFullName("New Traveler");
        mismatchReq.setEmail("newtraveler@test.com");
        mismatchReq.setPhoneNumber("9876512345");
        mismatchReq.setPassword("Password@123");
        mismatchReq.setConfirmPassword("Different@123");

        BadRequestException badReqEx = assertThrows(BadRequestException.class, () -> authService.register(mismatchReq));
        assertTrue(badReqEx.getMessage().contains("Passwords do not match"));
    }
}
