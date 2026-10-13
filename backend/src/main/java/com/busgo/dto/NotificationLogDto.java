package com.busgo.dto;

import com.busgo.entity.DeliveryStatus;
import com.busgo.entity.NotificationProvider;
import com.busgo.entity.NotificationType;

import java.time.OffsetDateTime;

public class NotificationLogDto {

    private Long id;
    private Long scheduleId;
    private String routeInfo;
    private String busRegNumber;
    private Long driverId;
    private String driverName;
    private String recipientPhone;

    private NotificationType notificationType;
    private NotificationProvider provider;
    private DeliveryStatus deliveryStatus;

    private String messagePayload;
    private String providerMessageId;
    private String errorMessage;
    private int retryCount;

    private OffsetDateTime scheduledFor;
    private OffsetDateTime sentAt;
    private OffsetDateTime createdAt;

    public NotificationLogDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getScheduleId() { return scheduleId; }
    public void setScheduleId(Long scheduleId) { this.scheduleId = scheduleId; }

    public String getRouteInfo() { return routeInfo; }
    public void setRouteInfo(String routeInfo) { this.routeInfo = routeInfo; }

    public String getBusRegNumber() { return busRegNumber; }
    public void setBusRegNumber(String busRegNumber) { this.busRegNumber = busRegNumber; }

    public Long getDriverId() { return driverId; }
    public void setDriverId(Long driverId) { this.driverId = driverId; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getRecipientPhone() { return recipientPhone; }
    public void setRecipientPhone(String recipientPhone) { this.recipientPhone = recipientPhone; }

    public NotificationType getNotificationType() { return notificationType; }
    public void setNotificationType(NotificationType notificationType) { this.notificationType = notificationType; }

    public NotificationProvider getProvider() { return provider; }
    public void setProvider(NotificationProvider provider) { this.provider = provider; }

    public DeliveryStatus getDeliveryStatus() { return deliveryStatus; }
    public void setDeliveryStatus(DeliveryStatus deliveryStatus) { this.deliveryStatus = deliveryStatus; }

    public String getMessagePayload() { return messagePayload; }
    public void setMessagePayload(String messagePayload) { this.messagePayload = messagePayload; }

    public String getProviderMessageId() { return providerMessageId; }
    public void setProviderMessageId(String providerMessageId) { this.providerMessageId = providerMessageId; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public int getRetryCount() { return retryCount; }
    public void setRetryCount(int retryCount) { this.retryCount = retryCount; }

    public OffsetDateTime getScheduledFor() { return scheduledFor; }
    public void setScheduledFor(OffsetDateTime scheduledFor) { this.scheduledFor = scheduledFor; }

    public OffsetDateTime getSentAt() { return sentAt; }
    public void setSentAt(OffsetDateTime sentAt) { this.sentAt = sentAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getTriggerSource() { return notificationType != null ? notificationType.name() : "SCHEDULED_DISPATCH"; }
}
