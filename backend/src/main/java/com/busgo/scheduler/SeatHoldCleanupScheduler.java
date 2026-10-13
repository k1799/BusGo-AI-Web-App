package com.busgo.scheduler;

import com.busgo.repository.SeatHoldRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneId;

@Component
public class SeatHoldCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(SeatHoldCleanupScheduler.class);

    private final SeatHoldRepository seatHoldRepository;

    public SeatHoldCleanupScheduler(SeatHoldRepository seatHoldRepository) {
        this.seatHoldRepository = seatHoldRepository;
    }

    /**
     * Executes every 30 seconds to expire abandoned holds.
     */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void cleanupExpiredSeatHolds() {
        try {
            OffsetDateTime now = OffsetDateTime.now(ZoneId.of("Asia/Kolkata"));
            int updated = seatHoldRepository.markExpiredHolds(now);
            if (updated > 0) {
                log.info("Cleaned up and released {} expired seat hold(s).", updated);
            }
        } catch (Exception e) {
            log.error("Error during seat hold cleanup: {}", e.getMessage());
        }
    }
}
