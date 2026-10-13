package com.busgo.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class ReportSummaryDto {

    private BigDecimal grossCollections;
    private BigDecimal totalRefunds;
    private BigDecimal netCollections;

    private long totalConfirmedBookings;
    private long totalCancelledBookings;

    private List<Map<String, Object>> routeWiseSummary;
    private List<Map<String, Object>> dailyRevenueSummary;

    public ReportSummaryDto() {}

    public BigDecimal getGrossCollections() { return grossCollections; }
    public void setGrossCollections(BigDecimal grossCollections) { this.grossCollections = grossCollections; }

    public BigDecimal getTotalRefunds() { return totalRefunds; }
    public void setTotalRefunds(BigDecimal totalRefunds) { this.totalRefunds = totalRefunds; }

    public BigDecimal getNetCollections() { return netCollections; }
    public void setNetCollections(BigDecimal netCollections) { this.netCollections = netCollections; }

    public long getTotalConfirmedBookings() { return totalConfirmedBookings; }
    public void setTotalConfirmedBookings(long totalConfirmedBookings) { this.totalConfirmedBookings = totalConfirmedBookings; }

    public long getTotalCancelledBookings() { return totalCancelledBookings; }
    public void setTotalCancelledBookings(long totalCancelledBookings) { this.totalCancelledBookings = totalCancelledBookings; }

    public List<Map<String, Object>> getRouteWiseSummary() { return routeWiseSummary; }
    public void setRouteWiseSummary(List<Map<String, Object>> routeWiseSummary) { this.routeWiseSummary = routeWiseSummary; }

    public List<Map<String, Object>> getDailyRevenueSummary() { return dailyRevenueSummary; }
    public void setDailyRevenueSummary(List<Map<String, Object>> dailyRevenueSummary) { this.dailyRevenueSummary = dailyRevenueSummary; }
}
