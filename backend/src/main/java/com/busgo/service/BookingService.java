package com.busgo.service;

import com.busgo.dto.*;
import com.busgo.entity.*;
import com.busgo.exception.BadRequestException;
import com.busgo.exception.ConflictException;
import com.busgo.exception.ResourceNotFoundException;
import com.busgo.exception.UnauthorizedException;
import com.busgo.payment.PaymentGatewayFactory;
import com.busgo.payment.PaymentGatewayService;
import com.busgo.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ScheduleRepository scheduleRepository;
    private final BusSeatRepository busSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final PaymentRepository paymentRepository;
    private final CancellationRefundRepository cancellationRefundRepository;
    private final PaymentGatewayFactory paymentGatewayFactory;
    private final DriverNotificationDispatcherService dispatcherService;

    public BookingService(BookingRepository bookingRepository,
                          BookingPassengerRepository passengerRepository,
                          BookingSeatRepository bookingSeatRepository,
                          ScheduleRepository scheduleRepository,
                          BusSeatRepository busSeatRepository,
                          SeatHoldRepository seatHoldRepository,
                          PaymentRepository paymentRepository,
                          CancellationRefundRepository cancellationRefundRepository,
                          PaymentGatewayFactory paymentGatewayFactory,
                          DriverNotificationDispatcherService dispatcherService) {
        this.bookingRepository = bookingRepository;
        this.passengerRepository = passengerRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.scheduleRepository = scheduleRepository;
        this.busSeatRepository = busSeatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.paymentRepository = paymentRepository;
        this.cancellationRefundRepository = cancellationRefundRepository;
        this.paymentGatewayFactory = paymentGatewayFactory;
        this.dispatcherService = dispatcherService;
    }

    @Transactional
    public BookingResponseDto createBooking(CreateBookingRequest request, User user) {
        Long scheduleId = request.getScheduleId();
        String holdToken = request.getHoldToken();
        List<PassengerRequestDto> passengerRequests = request.getPassengers();

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);

        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found: " + scheduleId));

        if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
            throw new BadRequestException("This scheduled trip is no longer active.");
        }
        if (schedule.getDepartureTime().isBefore(now)) {
            throw new BadRequestException("This trip has already departed.");
        }

        // Validate holds
        List<SeatHold> holds = seatHoldRepository.findByHoldTokenAndStatus(holdToken, HoldStatus.HELD);
        if (holds.isEmpty()) {
            throw new BadRequestException("No active seat hold found. Your hold may have expired. Please reselect seats.");
        }

        SeatHold firstHold = holds.get(0);
        if (firstHold.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Your seat hold has expired. Please select seats again.");
        }
        if (!firstHold.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("This seat hold does not belong to your account.");
        }

        Set<Long> heldSeatIds = holds.stream().map(h -> h.getSeat().getId()).collect(Collectors.toSet());
        if (heldSeatIds.size() != passengerRequests.size()) {
            throw new BadRequestException("Passenger count (" + passengerRequests.size() +
                    ") does not match held seat count (" + heldSeatIds.size() + ").");
        }

        // Authoritative backend calculation of fare
        BigDecimal baseFare = schedule.getBaseFare();
        BigDecimal totalAmount = baseFare.multiply(BigDecimal.valueOf(passengerRequests.size()));

        // Generate unique booking reference: BGO-YYYYMMDD-XXXX
        String datePart = LocalDate.now(istZone).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randPart = String.format("%04d", new Random().nextInt(10000));
        String bookingRef = "BGO-" + datePart + "-" + randPart;

        Booking booking = new Booking(bookingRef, user, schedule, passengerRequests.size(), totalAmount);
        booking.setBookingStatus(BookingStatus.PENDING_PAYMENT);
        Booking savedBooking = bookingRepository.save(booking);

        // Map and save passengers
        List<PassengerDetailDto> passengerDtos = new ArrayList<>();
        List<String> seatNumberList = new ArrayList<>();

        for (PassengerRequestDto pReq : passengerRequests) {
            Long seatId = pReq.getSeatId();
            if (seatId == null && pReq.getSeatNumber() != null) {
                for (SeatHold h : holds) {
                    if (h.getSeat().getSeatNumber().equalsIgnoreCase(pReq.getSeatNumber().trim())) {
                        seatId = h.getSeat().getId();
                        pReq.setSeatId(seatId);
                        break;
                    }
                }
            }

            if (seatId == null || !heldSeatIds.contains(seatId)) {
                throw new BadRequestException("Seat " + (pReq.getSeatNumber() != null ? pReq.getSeatNumber() : seatId) + " was not held in this session.");
            }

            final Long resolvedSeatId = seatId;
            BusSeat seat = busSeatRepository.findById(resolvedSeatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Seat not found: " + resolvedSeatId));

            String contact = pReq.getContactNumber();
            if (contact == null || contact.isBlank()) {
                contact = request.getContactPhone() != null && !request.getContactPhone().isBlank() ? request.getContactPhone() : user.getPhoneNumber();
            }

            BookingPassenger passenger = new BookingPassenger(
                    savedBooking,
                    seat,
                    seat.getSeatNumber(),
                    pReq.getPassengerName().trim(),
                    pReq.getPassengerAge(),
                    pReq.getPassengerGender(),
                    contact != null ? contact.trim() : "9876543210",
                    baseFare
            );
            BookingPassenger savedPassenger = passengerRepository.save(passenger);

            PassengerDetailDto pDto = new PassengerDetailDto();
            pDto.setId(savedPassenger.getId());
            pDto.setSeatId(seat.getId());
            pDto.setSeatNumber(seat.getSeatNumber());
            pDto.setPassengerName(savedPassenger.getPassengerName());
            pDto.setPassengerAge(savedPassenger.getPassengerAge());
            pDto.setPassengerGender(savedPassenger.getPassengerGender());
            pDto.setContactNumber(savedPassenger.getContactNumber());
            pDto.setFare(savedPassenger.getFare());
            passengerDtos.add(pDto);
            seatNumberList.add(seat.getSeatNumber());
        }

        // Convert holds to CONVERTED
        for (SeatHold h : holds) {
            h.setStatus(HoldStatus.CONVERTED);
            seatHoldRepository.save(h);
        }

        // Create Payment record & Order via PaymentGateway
        PaymentGatewayService gatewayService = paymentGatewayFactory.getService();
        Payment payment = new Payment(savedBooking, "", gatewayService.getProvider(), totalAmount);
        payment.setPaymentStatus(PaymentStatus.PENDING);
        Payment savedPayment = paymentRepository.save(payment);

        PaymentOrderDto orderDto = gatewayService.createOrder(savedBooking, savedPayment);
        savedPayment.setPaymentOrderId(orderDto.getPaymentOrderId());
        paymentRepository.save(savedPayment);

        return mapToBookingResponse(savedBooking, savedPayment, passengerDtos, seatNumberList);
    }

    @Transactional
    public PaymentOrderDto createPaymentOrder(CreatePaymentOrderRequest request, User user) {
        String bookingRef = request.getBookingReference();
        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingRef));

        if (!booking.getUser().getId().equals(user.getId()) && user.getRole() != Role.ROLE_ADMIN) {
            throw new UnauthorizedException("Unauthorized access to booking.");
        }

        Payment payment = paymentRepository.findByBookingId(booking.getId())
                .orElseGet(() -> {
                    Payment p = new Payment(booking, "", PaymentProvider.DEMO, booking.getTotalAmount());
                    p.setPaymentStatus(PaymentStatus.PENDING);
                    return paymentRepository.save(p);
                });

        PaymentGatewayService gatewayService = paymentGatewayFactory.getService();
        PaymentOrderDto orderDto = gatewayService.createOrder(booking, payment);
        payment.setPaymentOrderId(orderDto.getPaymentOrderId());
        paymentRepository.save(payment);

        orderDto.setOrderId(orderDto.getPaymentOrderId());
        orderDto.setPaymentId("PAY_" + orderDto.getPaymentOrderId());
        return orderDto;
    }

    @Transactional
    public PaymentResultDto verifyPayment(PaymentVerificationRequest request, User user) {
        String bookingRef = request.getBookingReference();
        String orderId = request.getPaymentOrderId();

        Booking booking = null;
        Payment payment = null;

        if (bookingRef != null && !bookingRef.isBlank()) {
            booking = bookingRepository.findByBookingReference(bookingRef).orElse(null);
        }

        if (booking == null && orderId != null && !orderId.isBlank()) {
            payment = paymentRepository.findByPaymentOrderId(orderId).orElse(null);
            if (payment != null) {
                booking = payment.getBooking();
                bookingRef = booking.getBookingReference();
            }
        }

        if (booking == null) {
            throw new ResourceNotFoundException("Booking not found for reference: " + bookingRef + " or order ID: " + orderId);
        }

        // Ownership or Admin check
        if (!booking.getUser().getId().equals(user.getId()) && user.getRole() != Role.ROLE_ADMIN) {
            throw new UnauthorizedException("Unauthorized access to booking.");
        }

        if (payment == null) {
            final Long bookingId = booking.getId();
            final String finalBookingRef = bookingRef;
            payment = paymentRepository.findByBookingId(bookingId)
                    .orElseThrow(() -> new ResourceNotFoundException("Payment record not found for booking: " + finalBookingRef));
        }

        // Idempotency check: if already CONFIRMED, return success immediately
        if (booking.getBookingStatus() == BookingStatus.CONFIRMED && payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return new PaymentResultDto(true, bookingRef, PaymentStatus.SUCCESS, BookingStatus.CONFIRMED,
                    "Payment already verified and booking confirmed.", payment.getPaymentTransactionId());
        }

        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("Booking has already been cancelled.");
        }

        PaymentGatewayService gatewayService = paymentGatewayFactory.getService();
        boolean verified = gatewayService.verifySignature(request, payment);

        if (verified) {
            String txnId = request.getPaymentTransactionId() != null && !request.getPaymentTransactionId().isBlank()
                    ? request.getPaymentTransactionId()
                    : "TXN_" + System.currentTimeMillis();

            payment.setPaymentTransactionId(txnId);
            payment.setPaymentStatus(PaymentStatus.SUCCESS);
            payment.setProviderSignature(request.getProviderSignature());
            paymentRepository.save(payment);

            booking.setBookingStatus(BookingStatus.CONFIRMED);
            bookingRepository.save(booking);

            // ACID Concurrency Check: Persist confirmed seats in booking_seats table
            // unique index uq_active_schedule_seat guarantees no double booking!
            List<BookingPassenger> passengers = passengerRepository.findByBookingId(booking.getId());
            for (BookingPassenger p : passengers) {
                BookingSeat bs = new BookingSeat(booking, booking.getSchedule(), p.getSeat(), p.getSeatNumber(), BookingSeatStatus.CONFIRMED);
                bookingSeatRepository.save(bs);
            }

            // Check if this was a late booking needing immediate dispatch
            dispatcherService.dispatchLateBookingNotification(booking);

            log.info("Booking {} successfully CONFIRMED with payment transaction {}", bookingRef, txnId);

            return new PaymentResultDto(true, bookingRef, PaymentStatus.SUCCESS, BookingStatus.CONFIRMED,
                    "Payment verified successfully! Your booking is confirmed.", txnId);
        } else {
            payment.setPaymentStatus(PaymentStatus.FAILED);
            payment.setFailureReason(request.getFailureReason() != null ? request.getFailureReason() : "Payment verification failed.");
            paymentRepository.save(payment);

            log.warn("Payment verification FAILED for booking {}", bookingRef);

            return new PaymentResultDto(false, bookingRef, PaymentStatus.FAILED, booking.getBookingStatus(),
                    "Payment verification failed: " + payment.getFailureReason(), null);
        }
    }

    @Transactional
    public CancellationResponseDto cancelBooking(String bookingReference, CancelBookingRequest request, User user) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingReference));

        if (!booking.getUser().getId().equals(user.getId()) && user.getRole() != Role.ROLE_ADMIN) {
            throw new UnauthorizedException("You are not authorised to cancel this booking.");
        }

        if (booking.getBookingStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Only CONFIRMED bookings can be cancelled.");
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);
        OffsetDateTime departureTime = booking.getSchedule().getDepartureTime();

        if (departureTime.isBefore(now)) {
            throw new BadRequestException("Cannot cancel a trip that has already departed.");
        }

        long hoursUntilDeparture = ChronoUnit.HOURS.between(now, departureTime);
        if (hoursUntilDeparture < 2) {
            throw new BadRequestException("Cancellations are strictly not permitted within 2 hours of departure.");
        }

        // Apply cancellation refund policy:
        // > 24 hours: 90% refund (10% charge)
        // 12 to 24 hours: 75% refund (25% charge)
        // 2 to 12 hours: 50% refund (50% charge)
        BigDecimal totalAmount = booking.getTotalAmount();
        BigDecimal refundPercentage;
        String policyApplied;

        if (hoursUntilDeparture >= 24) {
            refundPercentage = new BigDecimal("0.90");
            policyApplied = "Standard Policy (> 24 hours before departure): 90% refund";
        } else if (hoursUntilDeparture >= 12) {
            refundPercentage = new BigDecimal("0.75");
            policyApplied = "Intermediate Policy (12 - 24 hours before departure): 75% refund";
        } else {
            refundPercentage = new BigDecimal("0.50");
            policyApplied = "Short-notice Policy (2 - 12 hours before departure): 50% refund";
        }

        BigDecimal refundAmount = totalAmount.multiply(refundPercentage).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cancellationCharge = totalAmount.subtract(refundAmount).setScale(2, RoundingMode.HALF_UP);

        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(request.getReason());
        booking.setCancelledAt(now);
        bookingRepository.save(booking);

        // Cancel confirmed seats in booking_seats so they become available immediately!
        List<BookingSeat> bookedSeats = bookingSeatRepository.findByBookingId(booking.getId());
        for (BookingSeat bs : bookedSeats) {
            bs.setStatus(BookingSeatStatus.CANCELLED);
            bookingSeatRepository.save(bs);
        }

        // Update payment status to REFUND_PENDING
        Payment payment = paymentRepository.findByBookingId(booking.getId()).orElse(null);
        if (payment != null) {
            payment.setPaymentStatus(PaymentStatus.REFUND_PENDING);
            paymentRepository.save(payment);
        }

        String cancelRef = "CNX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        CancellationRefund cnx = new CancellationRefund(booking, payment, cancelRef, refundAmount, cancellationCharge, request.getReason());
        cnx.setRefundStatus(RefundStatus.PENDING);
        cancellationRefundRepository.save(cnx);

        log.info("Booking {} CANCELLED. Refund amount: INR {}, Charge: INR {}", bookingReference, refundAmount, cancellationCharge);

        CancellationResponseDto response = new CancellationResponseDto();
        response.setBookingReference(bookingReference);
        response.setCancellationReference(cancelRef);
        response.setOriginalAmount(totalAmount);
        response.setCancellationCharge(cancellationCharge);
        response.setRefundAmount(refundAmount);
        response.setRefundStatus(RefundStatus.PENDING);
        response.setPolicyApplied(policyApplied);
        response.setCancelledAt(now);

        return response;
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDto> getCustomerBookings(User user) {
        List<Booking> bookings = bookingRepository.findByUserIdWithDetails(user.getId());
        return bookings.stream().map(b -> {
            Payment p = paymentRepository.findByBookingId(b.getId()).orElse(null);
            List<BookingPassenger> passengers = passengerRepository.findByBookingId(b.getId());
            List<PassengerDetailDto> pDtos = passengers.stream().map(pass -> {
                PassengerDetailDto d = new PassengerDetailDto();
                d.setId(pass.getId());
                d.setSeatId(pass.getSeat().getId());
                d.setSeatNumber(pass.getSeatNumber());
                d.setPassengerName(pass.getPassengerName());
                d.setPassengerAge(pass.getPassengerAge());
                d.setPassengerGender(pass.getPassengerGender());
                d.setContactNumber(pass.getContactNumber());
                d.setFare(pass.getFare());
                return d;
            }).collect(Collectors.toList());

            List<String> seats = passengers.stream().map(BookingPassenger::getSeatNumber).collect(Collectors.toList());
            return mapToBookingResponse(b, p, pDtos, seats);
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DigitalTicketDto getDigitalTicket(String bookingReference, User user) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingReference));

        if (!booking.getUser().getId().equals(user.getId()) && user.getRole() != Role.ROLE_ADMIN) {
            throw new UnauthorizedException("Unauthorized access to ticket.");
        }

        Payment payment = paymentRepository.findByBookingId(booking.getId()).orElse(null);
        List<BookingPassenger> passengers = passengerRepository.findByBookingId(booking.getId());

        List<PassengerDetailDto> pDtos = passengers.stream().map(p -> {
            PassengerDetailDto d = new PassengerDetailDto();
            d.setId(p.getId());
            d.setSeatId(p.getSeat().getId());
            d.setSeatNumber(p.getSeatNumber());
            d.setPassengerName(p.getPassengerName());
            d.setPassengerAge(p.getPassengerAge());
            d.setPassengerGender(p.getPassengerGender());
            d.setContactNumber(p.getContactNumber());
            d.setFare(p.getFare());
            return d;
        }).collect(Collectors.toList());

        List<String> seatNumbers = passengers.stream().map(BookingPassenger::getSeatNumber).collect(Collectors.toList());

        DigitalTicketDto ticket = new DigitalTicketDto();
        ticket.setBookingReference(booking.getBookingReference());
        ticket.setBookingStatus(booking.getBookingStatus().name());
        ticket.setPaymentStatus(payment != null ? payment.getPaymentStatus().name() : "N/A");
        ticket.setPaymentTransactionId(payment != null ? payment.getPaymentTransactionId() : "N/A");

        ticket.setCustomerName(booking.getUser().getFullName());
        ticket.setCustomerEmail(booking.getUser().getEmail());
        ticket.setCustomerPhone(booking.getUser().getPhoneNumber());

        Schedule s = booking.getSchedule();
        ticket.setBusName(s.getBus().getBusName());
        ticket.setRegistrationNumber(s.getBus().getRegistrationNumber());
        ticket.setBusType(s.getBus().getBusType());

        ticket.setOriginCity(s.getRoute().getOriginCity());
        ticket.setDestinationCity(s.getRoute().getDestinationCity());
        ticket.setBoardingPoint(s.getRoute().getBoardingPoint());
        ticket.setDroppingPoint(s.getRoute().getDroppingPoint());

        ticket.setJourneyDate(s.getJourneyDate());
        ticket.setDepartureTime(s.getDepartureTime());
        ticket.setArrivalTime(s.getArrivalTime());
        ticket.setEstimatedDurationMinutes(s.getRoute().getEstimatedDurationMinutes());

        ticket.setTotalSeats(booking.getTotalSeats());
        ticket.setBaseFare(s.getBaseFare());
        ticket.setTotalAmount(booking.getTotalAmount());
        ticket.setPassengers(pDtos);
        ticket.setSeatNumbers(seatNumbers);
        ticket.setIssuedAt(booking.getCreatedAt());

        if (s.getDriver() != null) {
            ticket.setDriverName(s.getDriver().getFullName());
            ticket.setDriverPhone(s.getDriver().getPhoneNumber());
        } else {
            ticket.setDriverName("Assigned Driver");
            ticket.setDriverPhone("+919876543210");
        }
        ticket.setDriverNotificationStatus("SCHEDULED");

        if (payment != null) {
            ticket.setPaymentGateway(payment.getPaymentProvider() != null ? payment.getPaymentProvider().name() : "DEMO");
            ticket.setPaymentId(payment.getPaymentTransactionId());
        }

        // Safe QR Code payload (verifiable booking reference and timestamp, no passwords or card data)
        String qrPayload = "busgo://verify?ref=" + booking.getBookingReference() + "&schedule=" + s.getId() + "&seats=" + String.join(",", seatNumbers);
        ticket.setQrCodeData(qrPayload);
        ticket.setQrCodePayload(qrPayload);

        return ticket;
    }

    private BookingResponseDto mapToBookingResponse(Booking b, Payment p, List<PassengerDetailDto> pDtos, List<String> seatNumbers) {
        BookingResponseDto dto = new BookingResponseDto();
        dto.setId(b.getId());
        dto.setBookingReference(b.getBookingReference());
        dto.setBookingStatus(b.getBookingStatus());

        Schedule s = b.getSchedule();
        dto.setScheduleId(s.getId());
        dto.setBusName(s.getBus().getBusName());
        dto.setRegistrationNumber(s.getBus().getRegistrationNumber());
        dto.setBusType(s.getBus().getBusType());

        dto.setOriginCity(s.getRoute().getOriginCity());
        dto.setDestinationCity(s.getRoute().getDestinationCity());
        dto.setBoardingPoint(s.getRoute().getBoardingPoint());
        dto.setDroppingPoint(s.getRoute().getDroppingPoint());

        dto.setJourneyDate(s.getJourneyDate());
        dto.setDepartureTime(s.getDepartureTime());
        dto.setArrivalTime(s.getArrivalTime());
        dto.setEstimatedDurationMinutes(s.getRoute().getEstimatedDurationMinutes());

        dto.setTotalSeats(b.getTotalSeats());
        dto.setTotalAmount(b.getTotalAmount());
        dto.setSeatNumbers(seatNumbers);
        dto.setPassengers(pDtos);

        if (p != null) {
            dto.setPaymentStatus(p.getPaymentStatus());
            dto.setPaymentOrderId(p.getPaymentOrderId());
            dto.setPaymentTransactionId(p.getPaymentTransactionId());
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);
        boolean cancellable = b.getBookingStatus() == BookingStatus.CONFIRMED &&
                s.getDepartureTime().isAfter(now.plusHours(2));
        dto.setCancellationAllowed(cancellable);

        if (cancellable) {
            long hours = ChronoUnit.HOURS.between(now, s.getDepartureTime());
            BigDecimal refundPct = hours >= 24 ? new BigDecimal("0.90") : (hours >= 12 ? new BigDecimal("0.75") : new BigDecimal("0.50"));
            dto.setEstimatedRefundAmount(b.getTotalAmount().multiply(refundPct).setScale(2, RoundingMode.HALF_UP));
        }

        dto.setCancellationReason(b.getCancellationReason());
        dto.setCancelledAt(b.getCancelledAt());
        dto.setCreatedAt(b.getCreatedAt());

        return dto;
    }
}
