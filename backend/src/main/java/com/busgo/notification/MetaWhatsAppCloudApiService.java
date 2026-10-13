package com.busgo.notification;

import com.busgo.entity.NotificationProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class MetaWhatsAppCloudApiService implements WhatsAppNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MetaWhatsAppCloudApiService.class);

    private final String accessToken;
    private final String phoneNumberId;
    private final RestTemplate restTemplate;

    public MetaWhatsAppCloudApiService(
            @Value("${busgo.whatsapp.access-token:}") String accessToken,
            @Value("${busgo.whatsapp.phone-number-id:}") String phoneNumberId) {
        this.accessToken = accessToken != null ? accessToken.trim() : "";
        this.phoneNumberId = phoneNumberId != null ? phoneNumberId.trim() : "";
        this.restTemplate = new RestTemplate();
    }

    @Override
    public NotificationProvider getProvider() {
        return NotificationProvider.WHATSAPP_CLOUD_API;
    }

    @Override
    public WhatsAppSendResult sendMessage(String toPhoneNumber, String messageText) {
        if (accessToken.isBlank() || phoneNumberId.isBlank()) {
            String err = "WhatsApp Cloud API credentials not configured (missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID).";
            log.warn(err);
            return WhatsAppSendResult.failed(err);
        }

        try {
            String url = "https://graph.facebook.com/v19.0/" + phoneNumberId + "/messages";

            // Format recipient phone number: ensure country code without '+' or spaces
            String cleanPhone = toPhoneNumber.replaceAll("[^0-9]", "");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", cleanPhone);
            body.put("type", "text");

            Map<String, String> textMap = new HashMap<>();
            textMap.put("preview_url", "false");
            textMap.put("body", messageText);
            body.put("text", textMap);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("[WHATSAPP CLOUD API] Message dispatched successfully to {}", cleanPhone);
                return WhatsAppSendResult.ok("wamid.META_SENT_" + System.currentTimeMillis());
            } else {
                String errorMsg = "Provider returned HTTP " + response.getStatusCode();
                log.error("[WHATSAPP CLOUD API] Send failed: {}", errorMsg);
                return WhatsAppSendResult.failed(errorMsg);
            }
        } catch (Exception e) {
            log.error("[WHATSAPP CLOUD API] Exception while sending message to {}: {}", toPhoneNumber, e.getMessage());
            return WhatsAppSendResult.failed(e.getMessage());
        }
    }
}
