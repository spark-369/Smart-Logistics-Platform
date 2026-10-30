package com.slp.backend.service.impl;

import com.slp.backend.dto.request.ShipmentRequest;
import com.slp.backend.dto.response.PublicTrackingResponse;
import com.slp.backend.dto.response.ShipmentResponse;
import com.slp.backend.entity.Role;
import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.User;
import com.slp.backend.exception.BadRequestException;
import com.slp.backend.exception.ResourceNotFoundException;
import com.slp.backend.exception.UnauthorizedException;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.TrackingEventRepository;
import com.slp.backend.repository.UserRepository;
import com.slp.backend.repository.VehicleRepository;
import com.slp.backend.util.CurrentUserUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ShipmentServiceImpl}, focused on ownership/authorization rules and the
 * redacted public tracking projection.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ShipmentServiceImpl")
class ShipmentServiceImplTest {

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private TrackingEventRepository trackingEventRepository;

    @Mock
    private CurrentUserUtil currentUserUtil;

    @InjectMocks
    private ShipmentServiceImpl shipmentService;

    private User customer;
    private User otherCustomer;
    private Shipment shipment;

    @BeforeEach
    void setUp() {
        customer = user(1L, "customer@slp.test", Role.CUSTOMER);
        otherCustomer = user(2L, "other@slp.test", Role.CUSTOMER);
        shipment = Shipment.builder()
                .id(100L)
                .trackingNumber("SLP-ABCD1234")
                .sender(customer)
                .receiver(otherCustomer)
                .status(ShipmentStatus.PENDING)
                .originStreet("1 Origin St").originCity("Karachi").originState("Sindh")
                .originCountry("Pakistan").originZip("74000")
                .destStreet("2 Dest St").destCity("Berlin").destState("Berlin")
                .destCountry("Germany").destZip("10115")
                .weight(new BigDecimal("10.00"))
                .description("Parcel")
                .build();
    }

    private User user(Long id, String email, Role role) {
        return User.builder()
                .id(id).email(email).firstName("First").lastName("Last")
                .password("encoded").role(role).enabled(true)
                .build();
    }

    private ShipmentRequest validRequest(Long senderId, Long receiverId) {
        ShipmentRequest request = new ShipmentRequest();
        request.setSenderId(senderId);
        request.setReceiverId(receiverId);
        request.setOriginStreet("1 Origin St");
        request.setOriginCity("Karachi");
        request.setOriginState("Sindh");
        request.setOriginCountry("Pakistan");
        request.setOriginZip("74000");
        request.setDestStreet("2 Dest St");
        request.setDestCity("Berlin");
        request.setDestState("Berlin");
        request.setDestCountry("Germany");
        request.setDestZip("10115");
        request.setWeight(new BigDecimal("10.00"));
        request.setDescription("Parcel");
        return request;
    }

    @Nested
    @DisplayName("createShipment")
    class CreateShipment {

        @Test
        @DisplayName("creates a PENDING shipment for a customer sending to someone else")
        void createsPendingShipment() {
            when(currentUserUtil.getCurrentUser()).thenReturn(customer);
            when(userRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(userRepository.findById(2L)).thenReturn(Optional.of(otherCustomer));
            when(shipmentRepository.save(any(Shipment.class))).thenAnswer(inv -> {
                Shipment toSave = inv.getArgument(0);
                toSave.setId(100L);
                return toSave;
            });

            ShipmentResponse response = shipmentService.createShipment(validRequest(1L, 2L));

            assertThat(response.getStatus()).isEqualTo(ShipmentStatus.PENDING);
            assertThat(response.getTrackingNumber()).startsWith("SLP-");
            assertThat(response.getSenderId()).isEqualTo(1L);
            assertThat(response.getReceiverId()).isEqualTo(2L);
        }

        @Test
        @DisplayName("rejects a customer forging another user as the sender")
        void rejectsForgedSender() {
            when(currentUserUtil.getCurrentUser()).thenReturn(customer);

            assertThatThrownBy(() -> shipmentService.createShipment(validRequest(2L, 3L)))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("sender");
        }

        @Test
        @DisplayName("lets an admin book on behalf of any sender")
        void adminMayBookOnBehalf() {
            User admin = user(9L, "admin@slp.test", Role.ADMIN);
            when(currentUserUtil.getCurrentUser()).thenReturn(admin);
            when(userRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(userRepository.findById(2L)).thenReturn(Optional.of(otherCustomer));
            when(shipmentRepository.save(any(Shipment.class))).thenAnswer(inv -> inv.getArgument(0));

            ShipmentResponse response = shipmentService.createShipment(validRequest(1L, 2L));

            assertThat(response.getSenderId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("rejects sender equal to receiver")
        void rejectsSelfShipment() {
            when(currentUserUtil.getCurrentUser()).thenReturn(customer);

            assertThatThrownBy(() -> shipmentService.createShipment(validRequest(1L, 1L)))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("different");
        }

        @Test
        @DisplayName("rejects an unknown receiver")
        void rejectsUnknownReceiver() {
            when(currentUserUtil.getCurrentUser()).thenReturn(customer);
            when(userRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> shipmentService.createShipment(validRequest(1L, 99L)))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Receiver");
        }

        @Test
        @DisplayName("rejects an anonymous caller")
        void rejectsAnonymous() {
            when(currentUserUtil.getCurrentUser()).thenReturn(null);

            assertThatThrownBy(() -> shipmentService.createShipment(validRequest(1L, 2L)))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("logged in");
        }
    }

    @Nested
    @DisplayName("getPublicTracking")
    class PublicTracking {

        @Test
        @DisplayName("returns a redacted projection with events for anyone holding the tracking number")
        void returnsRedactedProjection() {
            when(shipmentRepository.findByTrackingNumber("SLP-ABCD1234")).thenReturn(Optional.of(shipment));
            when(trackingEventRepository.findByShipmentIdOrderByTimestampDesc(100L))
                    .thenReturn(java.util.List.of());

            PublicTrackingResponse response = shipmentService.getPublicTracking("SLP-ABCD1234");

            assertThat(response.getTrackingNumber()).isEqualTo("SLP-ABCD1234");
            assertThat(response.getStatus()).isEqualTo(ShipmentStatus.PENDING);
            assertThat(response.getOriginCity()).isEqualTo("Karachi");
            assertThat(response.getDestCity()).isEqualTo("Berlin");
            // No PII: the public projection has no sender/receiver names or street addresses.
            assertThat(response.getEvents()).isEmpty();
        }

        @Test
        @DisplayName("404s for an unknown tracking number")
        void unknownTrackingNumber() {
            when(shipmentRepository.findByTrackingNumber("SLP-NOPE")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> shipmentService.getPublicTracking("SLP-NOPE"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getShipmentByTrackingNumber (authenticated)")
    class AuthenticatedTracking {

        @Test
        @DisplayName("the sender can read their own shipment")
        void senderCanRead() {
            when(shipmentRepository.findByTrackingNumber("SLP-ABCD1234")).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(customer);

            ShipmentResponse response = shipmentService.getShipmentByTrackingNumber("SLP-ABCD1234");

            assertThat(response.getSenderName()).isEqualTo("First Last");
        }

        @Test
        @DisplayName("an unrelated customer is forbidden")
        void unrelatedCustomerForbidden() {
            User stranger = user(77L, "stranger@slp.test", Role.CUSTOMER);
            when(shipmentRepository.findByTrackingNumber("SLP-ABCD1234")).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(stranger);

            assertThatThrownBy(() -> shipmentService.getShipmentByTrackingNumber("SLP-ABCD1234"))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("permission");
        }

        @Test
        @DisplayName("an anonymous caller is rejected")
        void anonymousRejected() {
            when(shipmentRepository.findByTrackingNumber("SLP-ABCD1234")).thenReturn(Optional.of(shipment));
            when(currentUserUtil.getCurrentUser()).thenReturn(null);

            assertThatThrownBy(() -> shipmentService.getShipmentByTrackingNumber("SLP-ABCD1234"))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("logged in");
        }
    }
}
