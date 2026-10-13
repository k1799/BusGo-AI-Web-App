package com.busgo.service;

import com.busgo.dto.BusSeatDto;
import com.busgo.dto.SeatLayoutDto;
import com.busgo.dto.TripSearchResultDto;
import com.busgo.entity.*;
import com.busgo.exception.BadRequestException;
import com.busgo.exception.ResourceNotFoundException;
import com.busgo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TripService {

    private final ScheduleRepository scheduleRepository;
    private final BusSeatRepository busSeatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final RouteRepository routeRepository;

    public TripService(ScheduleRepository scheduleRepository,
                       BusSeatRepository busSeatRepository,
                       BookingSeatRepository bookingSeatRepository,
                       SeatHoldRepository seatHoldRepository,
                       RouteRepository routeRepository) {
        this.scheduleRepository = scheduleRepository;
        this.busSeatRepository = busSeatRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.routeRepository = routeRepository;
    }

    @Transactional(readOnly = true)
    public List<TripSearchResultDto> searchTrips(String origin, String destination, LocalDate journeyDate) {
        if (origin == null || destination == null || origin.trim().equalsIgnoreCase(destination.trim())) {
            throw new BadRequestException("Origin and Destination cannot be the same city.");
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        LocalDate todayInIst = LocalDate.now(istZone);
        if (journeyDate.isBefore(todayInIst)) {
            throw new BadRequestException("Journey date cannot be in the past.");
        }

        OffsetDateTime now = OffsetDateTime.now(istZone);
        // For today's date, show only buses whose departure date and time are still in the future (Asia/Kolkata).
        // For tomorrow and future dates, include all valid active schedules operating on that exact journey date.
        OffsetDateTime departureCutoff = journeyDate.isEqual(todayInIst)
                ? now
                : journeyDate.atStartOfDay(istZone).toOffsetDateTime().minusSeconds(1);

        List<Schedule> schedules = scheduleRepository.searchActiveTrips(
                origin.trim(), destination.trim(), journeyDate, ScheduleStatus.ACTIVE, departureCutoff);

        return schedules.stream().map(s -> {
            TripSearchResultDto dto = new TripSearchResultDto();
            dto.setScheduleId(s.getId());
            dto.setBusId(s.getBus().getId());
            dto.setBusName(s.getBus().getBusName());
            dto.setRegistrationNumber(s.getBus().getRegistrationNumber());
            dto.setBusType(s.getBus().getBusType());
            dto.setLayoutType(s.getBus().getLayoutType());
            dto.setAmenities(s.getBus().getAmenities());

            dto.setRouteId(s.getRoute().getId());
            dto.setOriginCity(s.getRoute().getOriginCity());
            dto.setDestinationCity(s.getRoute().getDestinationCity());
            dto.setBoardingPoint(s.getRoute().getBoardingPoint());
            dto.setDroppingPoint(s.getRoute().getDroppingPoint());
            dto.setEstimatedDurationMinutes(s.getRoute().getEstimatedDurationMinutes());
            dto.setDistanceKm(s.getRoute().getDistanceKm());

            dto.setJourneyDate(s.getJourneyDate());
            dto.setDepartureTime(s.getDepartureTime());
            dto.setArrivalTime(s.getArrivalTime());
            dto.setBaseFare(s.getBaseFare());

            int total = s.getBus().getTotalSeats();
            long confirmed = bookingSeatRepository.countConfirmedSeatsForSchedule(s.getId());
            long held = seatHoldRepository.findActiveHoldsForSchedule(s.getId(), now).size();

            int available = (int) Math.max(0, total - (confirmed + held));
            dto.setTotalSeats(total);
            dto.setAvailableSeats(available);

            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SeatLayoutDto getSeatLayout(Long scheduleId, Long currentUserId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule not found with id: " + scheduleId));

        if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
            throw new BadRequestException("This scheduled trip is no longer active.");
        }

        ZoneId istZone = ZoneId.of("Asia/Kolkata");
        OffsetDateTime now = OffsetDateTime.now(istZone);
        if (schedule.getDepartureTime().isBefore(now)) {
            throw new BadRequestException("This scheduled trip has already departed.");
        }

        Bus bus = schedule.getBus();
        List<BusSeat> seats = busSeatRepository.findByBusIdAndActiveTrueOrderByRowNumberAscColumnNumberAsc(bus.getId());

        // Get confirmed seat IDs
        Set<Long> confirmedSeatIds = new HashSet<>(bookingSeatRepository.findConfirmedSeatIdsForSchedule(scheduleId));

        // Get active seat holds
        List<SeatHold> activeHolds = seatHoldRepository.findActiveHoldsForSchedule(scheduleId, now);
        Map<Long, SeatHold> holdMap = new HashMap<>();
        for (SeatHold hold : activeHolds) {
            holdMap.put(hold.getSeat().getId(), hold);
        }

        List<BusSeatDto> seatDtos = new ArrayList<>();
        int bookedCount = 0;
        int heldCount = 0;

        for (BusSeat seat : seats) {
            BusSeatDto seatDto = new BusSeatDto();
            seatDto.setSeatId(seat.getId());
            seatDto.setSeatNumber(seat.getSeatNumber());
            seatDto.setSeatType(seat.getSeatType());
            seatDto.setDeck(seat.getDeck());
            seatDto.setRowNumber(seat.getRowNumber());
            seatDto.setColumnNumber(seat.getColumnNumber());
            seatDto.setFare(schedule.getBaseFare());

            if (confirmedSeatIds.contains(seat.getId())) {
                seatDto.setStatus("BOOKED");
                seatDto.setHeldByCurrentUser(false);
                bookedCount++;
            } else if (holdMap.containsKey(seat.getId())) {
                seatDto.setStatus("HELD");
                SeatHold h = holdMap.get(seat.getId());
                boolean isMine = currentUserId != null && h.getUser().getId().equals(currentUserId);
                seatDto.setHeldByCurrentUser(isMine);
                heldCount++;
            } else {
                seatDto.setStatus("AVAILABLE");
                seatDto.setHeldByCurrentUser(false);
            }

            seatDtos.add(seatDto);
        }

        SeatLayoutDto layout = new SeatLayoutDto();
        layout.setScheduleId(schedule.getId());
        layout.setBusId(bus.getId());
        layout.setBusName(bus.getBusName());
        layout.setRegistrationNumber(bus.getRegistrationNumber());
        layout.setBusType(bus.getBusType());
        layout.setLayoutType(bus.getLayoutType());

        layout.setRouteId(schedule.getRoute().getId());
        layout.setOriginCity(schedule.getRoute().getOriginCity());
        layout.setDestinationCity(schedule.getRoute().getDestinationCity());
        layout.setBoardingPoint(schedule.getRoute().getBoardingPoint());
        layout.setDroppingPoint(schedule.getRoute().getDroppingPoint());

        layout.setJourneyDate(schedule.getJourneyDate());
        layout.setDepartureTime(schedule.getDepartureTime());
        layout.setArrivalTime(schedule.getArrivalTime());
        layout.setBaseFare(schedule.getBaseFare());

        layout.setTotalSeats(bus.getTotalSeats());
        layout.setBookedCount(bookedCount);
        layout.setHeldCount(heldCount);
        layout.setAvailableCount(Math.max(0, bus.getTotalSeats() - (bookedCount + heldCount)));
        layout.setSeats(seatDtos);

        return layout;
    }

    @Transactional(readOnly = true)
    public Map<String, List<String>> getSearchCities() {
        List<String> origins = routeRepository.findDistinctOriginCities();
        List<String> destinations = routeRepository.findDistinctDestinationCities();
        Map<String, List<String>> result = new HashMap<>();
        result.put("origins", origins);
        result.put("destinations", destinations);
        return result;
    }

    @Transactional(readOnly = true)
    public List<com.busgo.dto.RouteDto> getPopularRoutes() {
        List<Route> activeRoutes = routeRepository.findByActiveTrue();
        return activeRoutes.stream().map(route -> {
            com.busgo.dto.RouteDto dto = new com.busgo.dto.RouteDto();
            dto.setId(route.getId());
            dto.setOriginCity(route.getOriginCity());
            dto.setDestinationCity(route.getDestinationCity());
            dto.setBoardingPoint(route.getBoardingPoint());
            dto.setDroppingPoint(route.getDroppingPoint());
            dto.setDistanceKm(route.getDistanceKm());
            dto.setEstimatedDurationMinutes(route.getEstimatedDurationMinutes());
            dto.setActive(route.isActive());

            List<Schedule> schedules = scheduleRepository.findActiveSchedulesByRouteId(route.getId());
            if (!schedules.isEmpty()) {
                Schedule lowest = schedules.get(0);
                dto.setBaseFare(lowest.getBaseFare());
                if (lowest.getBus() != null) {
                    dto.setBusType(lowest.getBus().getBusType());
                    dto.setLayoutType(lowest.getBus().getLayoutType());
                }
            }
            return dto;
        }).collect(Collectors.toList());
    }
}
