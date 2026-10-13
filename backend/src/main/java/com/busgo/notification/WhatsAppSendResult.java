package com.busgo.notification;

public class WhatsAppSendResult {

    private final boolean success;
    private final String messageId;
    private final String errorMessage;

    public WhatsAppSendResult(boolean success, String messageId, String errorMessage) {
        this.success = success;
        this.messageId = messageId;
        this.errorMessage = errorMessage;
    }

    public static WhatsAppSendResult ok(String messageId) {
        return new WhatsAppSendResult(true, messageId, null);
    }

    public static WhatsAppSendResult failed(String errorMessage) {
        return new WhatsAppSendResult(false, null, errorMessage);
    }

    public boolean isSuccess() { return success; }
    public String getMessageId() { return messageId; }
    public String getErrorMessage() { return errorMessage; }
}
