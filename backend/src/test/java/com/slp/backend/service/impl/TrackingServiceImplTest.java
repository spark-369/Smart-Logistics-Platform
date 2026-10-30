package com.slp.backend.service.impl;

import com.slp.backend.dto.request.TrackingEventRequest;
import com.slp.backend.dto.response.TrackingEventResponse;
import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.TrackingEvent;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.TrackingEventRepository;
import com.slp.backend.util.CurrentUserUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TrackingServiceImpl}.
 *
 * <p>Two rules are load-bearing here and are asserted directly:
 * <ol>
 *   <li>a DRIVER may only log events for shipments assigned to them;</li>
 *   <li>an IN_TRANSIT or DELIVERED event advances the shipment's own status (and stamps
 *       {@code actualDelivery} for DELIVERED), so the shipment list never contradicts the history.</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TrackingServiceImpl")
class TrackingServiceImplTest {

    @Mock
    private TrackingEventRepository trackingEventRepository;

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private CurrentUserUtil currentUserUtil;

    @InjectMocks
    private TrackingServiceImpl trackingService;

    private User driverUser;
    private User otherDriverUser;
    private Shipment shipment;
    private Shipment assignedShipment;

    @BeforeEach
    void setUp() {
        driverUser = user(10L, "driver@slp.test", Role.DRIVER);
        otherDriverUser = user(11L, "other-driver@slp.test", Role.DRIVER);

        Driver driver = Driver.builder()
                .id(1L)
                .licenseNumber("DL-1")
                .status(DriverStatus.ON_TRIP)
                .user(driverUser)
                .build();

        User sender = user(1L, "sender@slp.test", Role.CUSTOMER);
        User receiver = user(2L, "receiver@slp.test", Role.CUSTOMER);

        shipment = Shipment.builder()
                .id(100L)
                .trackingNumber("SLP-TRACK01")
                .sender(sender)
                .receiver(receiver)
                .status(ShipmentStatus.PENDING)
                .originStreet("1 Origin").originCity("Karachi").originState("Sindh")
                .originCountry("Pakistan").originZip("74000")
                .destStreet("2 Dest").destCity("Berlin").destState("Berlin")
                .destCountry("Germany").destZip("10115")
                .build();

        assignedShipment = Shipment.builder()
                .id(200L)
                .trackingNumber("SLP-TRACK02")
                .sender(sender)
                .receiver(receiver)
                .driver(driver)
                .status(ShipmentStatus.PENDING)
                .originStreet("1 Origin").originCity("Karachi").originState("Sindh")
                .originCountry("Pakistan").originZip("74000")
                .destStreet("2 Dest").destCity("Berlin").destState("Berlin")
                .destCountry("Germany").destZip("10115")
                .build();
    }

    private User user(Long id, String email, Role role) {
        return User.builder()
                .id(id).email(email).password("encoded")
                .firstName("First").lastName("Last").role(role).enabled(true)
                .build();
    }

    private TrackingEventRequest request(Long shipmentId, ShipmentStatus status, String location) {
        TrackingEventRequest request = new TrackingEventRequest();
        request.setShipmentId(shipmentId);
        request.setStatus(status);
        request.setLocation(location);
        request.setDescription("Test event");
        return request;
    }

    @Nested
    @DisplayName("addTrackingEvent")
    class AddTrackingEvent {

        @Test
        @DisplayName("an ADMIN can log an event for any shipment")
        void adminLogsForAnyShipment() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(user(1L, "admin@slp.test", Role.ADMIN));
            when(trackingEventRepository.save(any(TrackingEvent.class))).thenAnswer(inv -> {
                TrackingEvent event = inv.getArgument(0);
                event.setId(500L);
                return event;
            });
            when(shipmentRepository.save(any(Shipment.class))).thenAnswer(inv -> inv.getArgument(0));

            TrackingEventResponse response =
                    trackingService.addTrackingEvent(request(100L, ShipmentStatus.PENDING, "Karachi"));

            assertThat(response.getId()).isEqualTo(500L);
            assertThat(response.getStatus()).isEqualTo("PENDING");
            assertThat(response.getLocation()).isEqualTo("Karachi");
            // The event is the audit record of the transition, so the shipment follows it.
            assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.PENDING);
        }

        @Test
        @DisplayName("an ASSIGNED event is refused when the shipment has no driver and vehicle")
        void assignedRequiresDriverAndVehicle() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(user(1L, "admin@slp.test", Role.ADMIN));

            assertThatThrownBy(() ->
                    trackingService.addTrackingEvent(request(100L, ShipmentStatus.ASSIGNED, "Karachi")))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("driver and vehicle");

            // Nothing at all is written when the transition is rejected.
            assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.PENDING);
            verify(shipmentRepository, never()).save(any(Shipment.class));
            verify(trackingEventRepository, never()).save(any(TrackingEvent.class));
        }

        @Test
        @DisplayName("an IN_TRANSIT event advances the shipment status")
        void inTransitAdvancesShipment() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(user(1L, "admin@slp.test", Role.ADMIN));
            when(trackingEventRepository.save(any(TrackingEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(shipmentRepository.save(any(Shipment.class))).thenAnswer(inv -> inv.getArgument(0));

            trackingService.addTrackingEvent(request(100L, ShipmentStatus.IN_TRANSIT, "Dubai"));

            assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.IN_TRANSIT);
            assertThat(shipment.getActualDelivery()).isNull();
            verify(shipmentRepository).save(shipment);
        }

        @Test
        @DisplayName("a DELIVERED event advances the status and stamps actualDelivery")
        void deliveredStampsActualDelivery() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(user(1L, "admin@slp.test", Role.ADMIN));
            when(trackingEventRepository.save(any(TrackingEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(shipmentRepository.save(any(Shipment.class))).thenAnswer(inv -> inv.getArgument(0));

            trackingService.addTrackingEvent(request(100L, ShipmentStatus.DELIVERED, "Berlin"));

            assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.DELIVERED);
            assertThat(shipment.getActualDelivery()).isNotNull();
        }

        @Test
        @DisplayName("a DRIVER can log an event for a shipment assigned to them")
        void driverLogsOwnShipment() {
            when(shipmentRepository.findById(200L)).thenReturn(Optional.of(assignedShipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(driverUser);
            when(trackingEventRepository.save(any(TrackingEvent.class))).thenAnswer(inv -> inv.getArgument(0));

            TrackingEventResponse response =
                    trackingService.addTrackingEvent(request(200L, ShipmentStatus.IN_TRANSIT, "Lahore"));

            assertThat(response.getStatus()).isEqualTo("IN_TRANSIT");
        }

        @Test
        @DisplayName("a DRIVER cannot log an event for someone else's shipment")
        void driverCannotLogForeignShipment() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(otherDriverUser);

            assertThatThrownBy(() ->
                    trackingService.addTrackingEvent(request(100L, ShipmentStatus.IN_TRANSIT, "Nowhere")))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("assigned to you");

            verify(trackingEventRepository, never()).save(any());
        }

        @Test
        @DisplayName("a DRIVER cannot log against an unassigned shipment")
        void driverCannotLogUnassignedShipment() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(driverUser);

            assertThatThrownBy(() ->
                    trackingService.addTrackingEvent(request(100L, ShipmentStatus.IN_TRANSIT, "Nowhere")))
                    .isInstanceOf(UnauthorizedException.class);

            verify(trackingEventRepository, never()).save(any());
        }

        @Test
        @DisplayName("an anonymous caller is rejected")
        void anonymousRejected() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(null);

            assertThatThrownBy(() ->
                    trackingService.addTrackingEvent(request(100L, ShipmentStatus.IN_TRANSIT, "Nowhere")))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("logged in");
        }

        @Test
        @DisplayName("404s for an unknown shipment")
        void unknownShipment() {
            when(shipmentRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    trackingService.addTrackingEvent(request(999L, ShipmentStatus.IN_TRANSIT, "Nowhere")))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }
    }

    @Nested
    @DisplayName("getTrackingHistory")
    class GetHistory {

        @Test
        @DisplayName("returns the mapped event list newest-first")
        void returnsMappedList() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(user(1L, "admin@slp.test", Role.ADMIN));
            when(trackingEventRepository.findByShipmentIdOrderByTimestampDesc(100L))
                    .thenReturn(List.of(
                            TrackingEvent.builder().id(2L).shipment(shipment).status("IN_TRANSIT").location("Dubai").build(),
                            TrackingEvent.builder().id(1L).shipment(shipment).status("PENDING").location("Karachi").build()));

            List<TrackingEventResponse> history = trackingService.getTrackingHistory(100L);

            assertThat(history).hasSize(2);
            assertThat(history.get(0).getLocation()).isEqualTo("Dubai");
            assertThat(history.get(0).getShipmentId()).isEqualTo(100L);
        }

        @Test
        @DisplayName("the paginated variant maps the page and preserves totals")
        void returnsMappedPage() {
            Pageable pageable = PageRequest.of(0, 2);
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(user(1L, "admin@slp.test", Role.ADMIN));
            when(trackingEventRepository.findByShipmentId(100L, pageable))
                    .thenReturn(new PageImpl<>(
                            List.of(TrackingEvent.builder().id(1L).shipment(shipment).status("PENDING").location("Karachi").build()),
                            pageable, 3));

            Page<TrackingEventResponse> page = trackingService.getTrackingHistory(100L, pageable);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getTotalElements()).isEqualTo(3);
        }

        @Test
        @DisplayName("an anonymous caller cannot read the history")
        void anonymousCannotReadHistory() {
            when(shipmentRepository.findById(100L)).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(null);

            assertThatThrownBy(() -> trackingService.getTrackingHistory(100L))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("logged in");
        }

        @Test
        @DisplayName("404s for an unknown shipment")
        void unknownShipment() {
            when(shipmentRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> trackingService.getTrackingHistory(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
