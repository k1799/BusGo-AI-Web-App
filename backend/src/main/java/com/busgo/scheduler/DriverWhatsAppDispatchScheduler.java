package com.busgo.scheduler;

import com.busgo.service.DriverNotificationDispatcherService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DriverWhatsAppDispatchScheduler {

    private static final Logger log = LoggerFactory.getLogger(DriverWhatsAppDispatchScheduler.class);

    private final DriverNotificationDispatcherService dispatcherService;

    public DriverWhatsAppDispatchScheduler(DriverNotificationDispatcherService dispatcherService) {
        this.dispatcherService = dispatcherService;
    }

    /**
     * Executes every minute to inspect trips departing in 10 minutes.
     */
    @Scheduled(cron = "0 * * * * *")
    public void runScheduledDriverNotifications() {
        try {
            dispatcherService.dispatchUpcomingTripManifests();
        } catch (Exception e) {
            log.error("Error in driver WhatsApp dispatch scheduler: {}", e.getMessage(), e);
        }
    }
}
