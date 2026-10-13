package com.busgo.dto;

import java.math.BigDecimal;

public class AdminDashboardMetricsDto {

    private long totalActiveBuses;
    private long totalUpcomingTrips;
    private long todayBookingsCount;
    private long confirmedBookingsCount;
    private long cancelledBookingsCount;

    private BigDecimal grossRevenue;
    private BigDecimal refundedRevenue;
    private BigDecimal netRevenue;

    private long pendingRefundsCount;
    private long pendingNotificationsCount;
    private long failedNotificationsCount;
    private long totalNotificationsDispatched;

    public AdminDashboardMetricsDto() {}

    public long getTotalActiveBuses() { return totalActiveBuses; }
    public void setTotalActiveBuses(long totalActiveBuses) { this.totalActiveBuses = totalActiveBuses; }
    public long getActiveBusesCount() { return totalActiveBuses; }

    public long getTotalUpcomingTrips() { return totalUpcomingTrips; }
    public void setTotalUpcomingTrips(long totalUpcomingTrips) { this.totalUpcomingTrips = totalUpcomingTrips; }

    public long getTodayBookingsCount() { return todayBookingsCount; }
    public void setTodayBookingsCount(long todayBookingsCount) { this.todayBookingsCount = todayBookingsCount; }

    public long getConfirmedBookingsCount() { return confirmedBookingsCount; }
    public void setConfirmedBookingsCount(long confirmedBookingsCount) { this.confirmedBookingsCount = confirmedBookingsCount; }

    public long getCancelledBookingsCount() { return cancelledBookingsCount; }
    public void setCancelledBookingsCount(long cancelledBookingsCount) { this.cancelledBookingsCount = cancelledBookingsCount; }

    public BigDecimal getGrossRevenue() { return grossRevenue; }
    public void setGrossRevenue(BigDecimal grossRevenue) { this.grossRevenue = grossRevenue; }

    public BigDecimal getRefundedRevenue() { return refundedRevenue; }
    public void setRefundedRevenue(BigDecimal refundedRevenue) { this.refundedRevenue = refundedRevenue; }

    public BigDecimal getNetRevenue() { return netRevenue; }
    public void setNetRevenue(BigDecimal netRevenue) { this.netRevenue = netRevenue; }

    public long getPendingRefundsCount() { return pendingRefundsCount; }
    public void setPendingRefundsCount(long pendingRefundsCount) { this.pendingRefundsCount = pendingRefundsCount; }

    public long getPendingNotificationsCount() { return pendingNotificationsCount; }
    public void setPendingNotificationsCount(long pendingNotificationsCount) { this.pendingNotificationsCount = pendingNotificationsCount; }

    public long getFailedNotificationsCount() { return failedNotificationsCount; }
    public void setFailedNotificationsCount(long failedNotificationsCount) { this.failedNotificationsCount = failedNotificationsCount; }

    public long getTotalNotificationsDispatched() { return totalNotificationsDispatched; }
    public void setTotalNotificationsDispatched(long totalNotificationsDispatched) { this.totalNotificationsDispatched = totalNotificationsDispatched; }

    // Frontend KPI aliases
    public long getTotalBookings() { return confirmedBookingsCount + cancelledBookingsCount; }
    public long getConfirmedBookings() { return confirmedBookingsCount; }
    public long getCancelledBookings() { return cancelledBookingsCount; }
    public BigDecimal getTotalRevenue() { return netRevenue != null ? netRevenue : grossRevenue; }
    public BigDecimal getTotalRefundsAmount() { return refundedRevenue; }
    public long getActiveSchedules() { return totalUpcomingTrips; }
    public long getWhatsappSentCount() { return totalNotificationsDispatched; }
}
