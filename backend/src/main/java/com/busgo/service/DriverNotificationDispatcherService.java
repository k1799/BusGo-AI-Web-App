package com.busgo.service;

import com.busgo.entity.*;
import com.busgo.notification.NotificationServiceFactory;
import com.busgo.notification.WhatsAppNotificationService;
import com.busgo.notification.WhatsAppSendResult;
import com.busgo.repository.BookingPassengerRepository;
import com.busgo.repository.BookingRepository;
import com.busgo.repository.NotificationLogRepository;
import com.busgo.repository.ScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DriverNotificationDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(DriverNotificationDispatcherService.class);

    private final ScheduleRepository scheduleRepository;
    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final NotificationServiceFactory notificationServiceFactory;
    private final int leadMinutes;

    public DriverNotificationDispatcherService(
            ScheduleRepository scheduleRepository,
            BookingRepository bookingRepository,
            BookingPassengerRepository passengerRepository,
            NotificationLogRepository notificationLogRepository,
            NotificationServiceFactory notificationServiceFactory,
            @Value("${busgo.whatsapp.lead-minutes:10}") int leadMinutes) {
        this.scheduleRepository = scheduleRepository;
        this.bookingRepository = bookingRepository;
        this.passengerRepository = passengerRepository;
        this.notificationLogRepository = notificationLogRepository;
        this.notificationServiceFactory = notificationServiceFactory;
        this.leadMinutes = leadMinutes;
    }

    /**
     * Checks all upcoming schedules departing in ~10 minutes and sends the trip manifest to the driver.
     * Guaranteed atomic idempotency via database unique key on notification_logs.
     */
    @Transactional
    public void dispatchUpcomingTripManifests() {
        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);

        // Window: departure between now + (leadMinutes - 1) and now + (leadMinutes + 2)
        // E.g., if leadMinutes is 10, check departures 9 to 12 minutes from now
        OffsetDateTime windowStart = now.plusMinutes(leadMinutes - 1);
        OffsetDateTime windowEnd = now.plusMinutes(leadMinutes + 2);

        List<Schedule> upcomingSchedules = scheduleRepository.findSchedulesForDriverNotification(windowStart, windowEnd);

        for (Schedule schedule : upcomingSchedules) {
            String idempotencyKey = "MANIFEST_10MIN_SCHED_" + schedule.getId();

            if (notificationLogRepository.existsByIdempotencyKey(idempotencyKey)) {
                // Idempotent: Already dispatched!
                continue;
            }

            dispatchManifestForSchedule(schedule, NotificationType.TRIP_MANIFEST_10MIN, idempotencyKey);
        }
    }

    @Transactional
    public NotificationLog dispatchManifestForSchedule(Schedule schedule, NotificationType type, String idempotencyKey) {
        Driver driver = schedule.getDriver();
        if (driver == null || !driver.isActive() || driver.getWhatsappNumber() == null) {
            log.warn("Cannot dispatch notification for schedule {}: No active driver with WhatsApp number assigned.", schedule.getId());
            return null;
        }

        List<Booking> confirmedBookings = bookingRepository.findConfirmedBookingsForSchedule(schedule.getId());
        String messagePayload = buildManifestMessage(schedule, confirmedBookings);

        WhatsAppNotificationService notificationService = notificationServiceFactory.getService();
        NotificationLog notificationLog = new NotificationLog(
                schedule,
                driver,
                null,
                type,
                driver.getWhatsappNumber(),
                messagePayload,
                notificationService.getProvider(),
                schedule.getDepartureTime().minusMinutes(leadMinutes),
                idempotencyKey
        );

        try {
            WhatsAppSendResult result = notificationService.sendMessage(driver.getWhatsappNumber(), messagePayload);
            if (result.isSuccess()) {
                notificationLog.setDeliveryStatus(DeliveryStatus.SENT);
                notificationLog.setProviderMessageId(result.getMessageId());
                notificationLog.setSentAt(OffsetDateTime.now(ZoneId.of("Asia/Kolkata")));
                log.info("Dispatched WhatsApp manifest to driver {} ({}) for schedule {}",
                        driver.getDriverName(), driver.getWhatsappNumber(), schedule.getId());
            } else {
                notificationLog.setDeliveryStatus(DeliveryStatus.FAILED);
                notificationLog.setErrorMessage(result.getErrorMessage());
                log.error("Failed to dispatch WhatsApp manifest to driver {}: {}",
                        driver.getDriverName(), result.getErrorMessage());
            }
        } catch (Exception e) {
            notificationLog.setDeliveryStatus(DeliveryStatus.FAILED);
            notificationLog.setErrorMessage(e.getMessage());
            log.error("Exception during WhatsApp dispatch: {}", e.getMessage());
        }

        return notificationLogRepository.save(notificationLog);
    }

    @Transactional
    public void dispatchLateBookingNotification(Booking booking) {
        Schedule schedule = booking.getSchedule();
        Driver driver = schedule.getDriver();
        if (driver == null || !driver.isActive() || driver.getWhatsappNumber() == null) {
            return;
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);
        OffsetDateTime targetTime = schedule.getDepartureTime().minusMinutes(leadMinutes);

        // Only send if booking was confirmed after the 10-minute departure target
        if (now.isAfter(targetTime) && now.isBefore(schedule.getDepartureTime())) {
            String idempotencyKey = "LATE_BOOKING_SCHED_" + schedule.getId() + "_BK_" + booking.getId();
            if (notificationLogRepository.existsByIdempotencyKey(idempotencyKey)) {
                return;
            }

            StringBuilder sb = new StringBuilder();
            sb.append("⚡ *BUSGO LATE BOOKING ALERT*\n");
            sb.append("Trip departing shortly at: ").append(formatTime(schedule.getDepartureTime())).append("\n");
            sb.append("Booking Ref: ").append(booking.getBookingReference()).append("\n");
            sb.append("Seats: ");

            List<BookingPassenger> passengers = passengerRepository.findByBookingId(booking.getId());
            for (BookingPassenger p : passengers) {
                sb.append(p.getSeatNumber()).append(" (").append(p.getPassengerName()).append("), ");
            }

            String msg = sb.toString();
            WhatsAppNotificationService notificationService = notificationServiceFactory.getService();

            NotificationLog nLog = new NotificationLog(
                    schedule,
                    driver,
                    booking,
                    NotificationType.LATE_BOOKING,
                    driver.getWhatsappNumber(),
                    msg,
                    notificationService.getProvider(),
                    now,
                    idempotencyKey
            );

            WhatsAppSendResult result = notificationService.sendMessage(driver.getWhatsappNumber(), msg);
            if (result.isSuccess()) {
                nLog.setDeliveryStatus(DeliveryStatus.SENT);
                nLog.setProviderMessageId(result.getMessageId());
                nLog.setSentAt(now);
            } else {
                nLog.setDeliveryStatus(DeliveryStatus.FAILED);
                nLog.setErrorMessage(result.getErrorMessage());
            }
            notificationLogRepository.save(nLog);
        }
    }

    private String buildManifestMessage(Schedule schedule, List<Booking> confirmedBookings) {
        StringBuilder sb = new StringBuilder();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd-MMM-yyyy");

        sb.append("🚌 *BUSGO TRIP MANIFEST - 10 MIN DEPARTURE ALERT*\n");
        sb.append("========================================\n");
        sb.append("Bus Reg: ").append(schedule.getBus().getRegistrationNumber())
          .append(" (").append(schedule.getBus().getBusName()).append(")\n");
        sb.append("Route: ").append(schedule.getRoute().getOriginCity())
          .append(" \u2192 ").append(schedule.getRoute().getDestinationCity()).append("\n");
        sb.append("Boarding: ").append(schedule.getRoute().getBoardingPoint()).append("\n");
        sb.append("Departure: ").append(schedule.getDepartureTime().format(timeFmt))
          .append(" IST (").append(schedule.getJourneyDate().format(dateFmt)).append(")\n");
        sb.append("Driver: ").append(schedule.getDriver().getDriverName())
          .append(" (").append(schedule.getDriver().getPhoneNumber()).append(")\n");
        sb.append("========================================\n");
        sb.append("*PASSENGER MANIFEST*\n");

        int totalPassengers = 0;
        int count = 1;

        if (confirmedBookings.isEmpty()) {
            sb.append("No confirmed passenger bookings for this trip.\n");
        } else {
            for (Booking booking : confirmedBookings) {
                List<BookingPassenger> passengers = passengerRepository.findByBookingId(booking.getId());
                for (BookingPassenger p : passengers) {
                    totalPassengers++;
                    sb.append(count++).append(". [").append(booking.getBookingReference()).append("] ")
                      .append("Seat ").append(p.getSeatNumber()).append(": ")
                      .append(p.getPassengerName()).append(" (")
                      .append(p.getPassengerAge()).append("y, ").append(p.getPassengerGender()).append(")\n");
                }
            }
            sb.append("----------------------------------------\n");
            sb.append("Total Bookings: ").append(confirmedBookings.size())
              .append(" | Total Passengers: ").append(totalPassengers).append("\n");
        }

        sb.append("========================================\n");
        sb.append("Please verify tickets during boarding. Have a safe journey!\n");

        return sb.toString();
    }

    private String formatTime(OffsetDateTime odt) {
        return odt.format(DateTimeFormatter.ofPattern("hh:mm a"));
    }
}
