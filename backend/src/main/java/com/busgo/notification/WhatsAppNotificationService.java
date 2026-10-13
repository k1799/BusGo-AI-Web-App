package com.busgo.notification;

import com.busgo.entity.NotificationProvider;

public interface WhatsAppNotificationService {
    NotificationProvider getProvider();
    WhatsAppSendResult sendMessage(String toPhoneNumber, String messageText);
}
