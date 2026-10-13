package com.busgo.service;

import com.busgo.dto.HoldSeatsRequest;
import com.busgo.dto.HoldSeatsResponseDto;
import com.busgo.dto.SeatHoldItemDto;
import com.busgo.entity.*;
import com.busgo.exception.BadRequestException;
import com.busgo.exception.ConflictException;
import com.busgo.exception.ResourceNotFoundException;
import com.busgo.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class SeatHoldService {

    private final ScheduleRepository scheduleRepository;
    private final BusSeatRepository busSeatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final long holdDurationSeconds;

    public SeatHoldService(
            ScheduleRepository scheduleRepository,
            BusSeatRepository busSeatRepository,
            BookingSeatRepository bookingSeatRepository,
            SeatHoldRepository seatHoldRepository,
            @Value("${busgo.booking.hold-duration-seconds:600}") long holdDurationSeconds) {
        this.scheduleRepository = scheduleRepository;
        this.busSeatRepository = busSeatRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.holdDurationSeconds = holdDurationSeconds;
    }

    @Transactional
    public HoldSeatsResponseDto holdSeats(HoldSeatsRequest request, User user) {
        Long scheduleId = request.getScheduleId();
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found with id: " + scheduleId));

        List<Long> seatIds = request.getSeatIds();
        if ((seatIds == null || seatIds.isEmpty()) && request.getSeatNumbers() != null && !request.getSeatNumbers().isEmpty()) {
            List<com.busgo.entity.BusSeat> seats = busSeatRepository.findByBusId(schedule.getBus().getId());
            seatIds = seats.stream()
                    .filter(s -> request.getSeatNumbers().contains(s.getSeatNumber()))
                    .map(com.busgo.entity.BusSeat::getId)
                    .toList();
        }

        if (seatIds == null || seatIds.isEmpty() || seatIds.size() > 6) {
            throw new BadRequestException("You can hold between 1 and 6 seats per transaction.");
        }

        if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
            throw new BadRequestException("Trip schedule is no longer active.");
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);
        if (schedule.getDepartureTime().isBefore(now)) {
            throw new BadRequestException("Trip has already departed.");
        }

        // Concurrency protection: Check confirmed seats
        for (Long seatId : seatIds) {
            boolean alreadyBooked = bookingSeatRepository.existsByScheduleIdAndSeatIdAndStatus(
                    scheduleId, seatId, BookingSeatStatus.CONFIRMED);
            if (alreadyBooked) {
                BusSeat seat = busSeatRepository.findById(seatId).orElse(null);
                String seatNum = seat != null ? seat.getSeatNumber() : String.valueOf(seatId);
                throw new ConflictException("Seat " + seatNum + " is already booked by another customer.");
            }
        }

        // Concurrency protection: Check existing active holds by other users
        List<SeatHold> existingHolds = seatHoldRepository.findActiveHoldsForSeats(scheduleId, seatIds, now);
        for (SeatHold hold : existingHolds) {
            if (!hold.getUser().getId().equals(user.getId())) {
                throw new ConflictException("Seat " + hold.getSeat().getSeatNumber() + " is temporarily held by another customer.");
            }
        }

        String holdToken = UUID.randomUUID().toString();
        OffsetDateTime expiresAt = now.plusSeconds(holdDurationSeconds);

        List<SeatHoldItemDto> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Long seatId : seatIds) {
            BusSeat seat = busSeatRepository.findById(seatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Seat not found with id: " + seatId));

            if (!seat.getBus().getId().equals(schedule.getBus().getId())) {
                throw new BadRequestException("Seat " + seat.getSeatNumber() + " does not belong to this trip's bus.");
            }

            SeatHold hold = new SeatHold(schedule, seat, user, holdToken, expiresAt);
            seatHoldRepository.save(hold);

            BigDecimal fare = schedule.getBaseFare();
            totalAmount = totalAmount.add(fare);
            items.add(new SeatHoldItemDto(seat.getId(), seat.getSeatNumber(), seat.getSeatType().name(), fare));
        }

        HoldSeatsResponseDto response = new HoldSeatsResponseDto();
        response.setHoldToken(holdToken);
        response.setScheduleId(scheduleId);
        response.setExpiresAt(expiresAt);
        response.setRemainingSeconds(holdDurationSeconds);
        response.setSeatCount(items.size());
        response.setTotalAmount(totalAmount);
        response.setHeldSeats(items);

        return response;
    }

    @Transactional
    public void releaseHold(String holdToken, User user) {
        List<SeatHold> holds = seatHoldRepository.findByHoldTokenAndStatus(holdToken, HoldStatus.HELD);
        for (SeatHold hold : holds) {
            if (hold.getUser().getId().equals(user.getId())) {
                hold.setStatus(HoldStatus.RELEASED);
                seatHoldRepository.save(hold);
            }
        }
    }

    @Transactional(readOnly = true)
    public HoldSeatsResponseDto getHoldStatus(String holdToken) {
        List<SeatHold> holds = seatHoldRepository.findByHoldTokenAndStatus(holdToken, HoldStatus.HELD);
        if (holds.isEmpty()) {
            throw new ResourceNotFoundException("No active hold found for token: " + holdToken);
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);
        SeatHold first = holds.get(0);

        if (first.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Seat hold has expired. Please reselect your seats.");
        }

        long remaining = Math.max(0, ChronoUnit.SECONDS.between(now, first.getExpiresAt()));
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<SeatHoldItemDto> items = new ArrayList<>();

        for (SeatHold h : holds) {
            BigDecimal fare = h.getSchedule().getBaseFare();
            totalAmount = totalAmount.add(fare);
            items.add(new SeatHoldItemDto(h.getSeat().getId(), h.getSeat().getSeatNumber(), h.getSeat().getSeatType().name(), fare));
        }

        HoldSeatsResponseDto response = new HoldSeatsResponseDto();
        response.setHoldToken(holdToken);
        response.setScheduleId(first.getSchedule().getId());
        response.setExpiresAt(first.getExpiresAt());
        response.setRemainingSeconds(remaining);
        response.setSeatCount(items.size());
        response.setTotalAmount(totalAmount);
        response.setHeldSeats(items);

        return response;
    }
}
