package com.busgo.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class NotificationServiceFactory {

    private final MockWhatsAppNotificationService mockService;
    private final MetaWhatsAppCloudApiService cloudApiService;
    private final String configuredMode;

    public NotificationServiceFactory(
            MockWhatsAppNotificationService mockService,
            MetaWhatsAppCloudApiService cloudApiService,
            @Value("${busgo.whatsapp.mode:MOCK}") String configuredMode) {
        this.mockService = mockService;
        this.cloudApiService = cloudApiService;
        this.configuredMode = configuredMode;
    }

    public WhatsAppNotificationService getService() {
        if ("CLOUD_API".equalsIgnoreCase(configuredMode)) {
            return cloudApiService;
        }
        return mockService;
    }
}
