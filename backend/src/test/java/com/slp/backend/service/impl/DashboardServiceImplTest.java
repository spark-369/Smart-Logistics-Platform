package com.slp.backend.service.impl;

import com.slp.backend.dto.response.DashboardStatsResponse;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.repository.VehicleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link DashboardServiceImpl}.
 *
 * <p>The dashboard is the first screen every ADMIN/DISPATCHER sees, so the aggregation contract
 * (totals plus a status breakdown covering every enum value) is asserted explicitly rather than
 * left to the end-to-end suite.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DashboardServiceImpl")
class DashboardServiceImplTest {

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DriverRepository driverRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    @DisplayName("aggregates shipment, user, driver and vehicle totals")
    void aggregatesTotals() {
        // getStats() iterates every ShipmentStatus value, so every constant must be stubbed.
        // Mockito's strict stubbing rejects a call whose arguments match no stub while other
        // stubs for the same method exist (PotentialStubbingProblem), so a partial set of
        // stubs would fail here rather than return the zero default.
        when(shipmentRepository.count()).thenReturn(42L);
        when(shipmentRepository.countByStatus(ShipmentStatus.PENDING)).thenReturn(7L);
        when(shipmentRepository.countByStatus(ShipmentStatus.ASSIGNED)).thenReturn(4L);
        when(shipmentRepository.countByStatus(ShipmentStatus.IN_TRANSIT)).thenReturn(11L);
        when(shipmentRepository.countByStatus(ShipmentStatus.DELIVERED)).thenReturn(20L);
        when(shipmentRepository.countByStatus(ShipmentStatus.CANCELLED)).thenReturn(0L);
        when(userRepository.count()).thenReturn(15L);
        when(driverRepository.count()).thenReturn(6L);
        when(vehicleRepository.count()).thenReturn(4L);

        DashboardStatsResponse stats = dashboardService.getStats();

        assertThat(stats.getTotalShipments()).isEqualTo(42L);
        assertThat(stats.getPendingShipments()).isEqualTo(7L);
        assertThat(stats.getInTransitShipments()).isEqualTo(11L);
        assertThat(stats.getDeliveredShipments()).isEqualTo(20L);
        assertThat(stats.getTotalUsers()).isEqualTo(15L);
        assertThat(stats.getTotalDrivers()).isEqualTo(6L);
        assertThat(stats.getTotalVehicles()).isEqualTo(4L);
    }

    @Test
    @DisplayName("the status breakdown contains every ShipmentStatus key, even when zero")
    void breakdownCoversEveryStatus() {
        when(shipmentRepository.count()).thenReturn(0L);
        when(shipmentRepository.countByStatus(ShipmentStatus.PENDING)).thenReturn(0L);
        when(shipmentRepository.countByStatus(ShipmentStatus.IN_TRANSIT)).thenReturn(0L);
        when(shipmentRepository.countByStatus(ShipmentStatus.DELIVERED)).thenReturn(0L);
        when(shipmentRepository.countByStatus(ShipmentStatus.ASSIGNED)).thenReturn(3L);
        when(shipmentRepository.countByStatus(ShipmentStatus.CANCELLED)).thenReturn(1L);

        DashboardStatsResponse stats = dashboardService.getStats();

        // The dashboard chart iterates this map; a missing key would render an incomplete chart.
        assertThat(stats.getShipmentsByStatus())
                .hasSize(ShipmentStatus.values().length)
                .containsKeys("PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "CANCELLED");
        assertThat(stats.getShipmentsByStatus().get("ASSIGNED")).isEqualTo(3L);
        assertThat(stats.getShipmentsByStatus().get("CANCELLED")).isEqualTo(1L);
    }

    @Test
    @DisplayName("an empty database reports zeroes rather than nulls")
    void emptyDatabaseReportsZeroes() {
        when(shipmentRepository.count()).thenReturn(0L);

        DashboardStatsResponse stats = dashboardService.getStats();

        assertThat(stats.getTotalShipments()).isZero();
        assertThat(stats.getTotalUsers()).isZero();
        assertThat(stats.getTotalDrivers()).isZero();
        assertThat(stats.getTotalVehicles()).isZero();
        assertThat(stats.getShipmentsByStatus()).isNotNull();
    }
}
