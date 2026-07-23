package com.slp.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class DashboardStatsResponse {
    private long totalShipments;
    private long pendingShipments;
    private long inTransitShipments;
    private long deliveredShipments;
    private long totalUsers;
    private long totalDrivers;
    private long totalVehicles;
    private Map<String, Long> shipmentsByStatus;
}
