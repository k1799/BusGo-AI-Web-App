package com.busgo.notification;

import com.busgo.entity.NotificationProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class MockWhatsAppNotificationService implements WhatsAppNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MockWhatsAppNotificationService.class);

    @Override
    public NotificationProvider getProvider() {
        return NotificationProvider.MOCK;
    }

    @Override
    public WhatsAppSendResult sendMessage(String toPhoneNumber, String messageText) {
        String mockMessageId = "wamid.MOCK_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("""
                
                ==================== [WHATSAPP DISPATCH: MOCK MODE] ====================
                TO: {}
                SIMULATED MESSAGE ID: {}
                PAYLOAD:
                {}
                ========================================================================
                """, toPhoneNumber, mockMessageId, messageText);

        return WhatsAppSendResult.ok(mockMessageId);
    }
}
