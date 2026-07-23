package com.slp.backend.service.impl;

import com.slp.backend.dto.response.DashboardStatsResponse;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.VehicleRepository;
import com.slp.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final ShipmentRepository shipmentRepository;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;

    @Override
    public DashboardStatsResponse getStats() {
        Map<ShipmentStatus, Long> shipmentsByStatus = new EnumMap<>(ShipmentStatus.class);
        for (ShipmentStatus status : ShipmentStatus.values()) {
            shipmentsByStatus.put(status, shipmentRepository.countByStatus(status));
        }

        Map<String, Long> shipmentsByStatusString = shipmentsByStatus.entrySet().stream()
                .collect(Collectors.toMap(e -> e.getKey().name(), Map.Entry::getValue));

        return new DashboardStatsResponse(
                shipmentRepository.count(),
                shipmentRepository.countByStatus(ShipmentStatus.PENDING),
                shipmentRepository.countByStatus(ShipmentStatus.IN_TRANSIT),
                shipmentRepository.countByStatus(ShipmentStatus.DELIVERED),
                userRepository.count(),
                driverRepository.count(),
                vehicleRepository.count(),
                shipmentsByStatusString
        );
    }
}
