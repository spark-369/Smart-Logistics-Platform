package com.slp.backend.support;

import com.slp.backend.entity.Driver;
import com.slp.backend.entity.DriverStatus;
import com.slp.backend.entity.Notification;
import com.slp.backend.entity.Shipment;
import com.slp.backend.entity.ShipmentStatus;
import com.slp.backend.entity.TrackingEvent;
import com.slp.backend.entity.User;
import com.slp.backend.entity.Vehicle;
import com.slp.backend.entity.VehicleStatus;
import com.slp.backend.repository.DriverRepository;
import com.slp.backend.repository.NotificationRepository;
import com.slp.backend.repository.ShipmentRepository;
import com.slp.backend.repository.TrackingEventRepository;
import com.slp.backend.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Small factory used by tests to build valid persisted domain graphs.
 *
 * <p>Kept deliberately dumb (no validation) so tests can also create intentionally odd states such
 * as an INACTIVE driver attached to a vehicle.
 */
@Component
public class TestDataFactory {

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private ShipmentRepository shipmentRepository;

    @Autowired
    private TrackingEventRepository trackingEventRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    /** Creates a driver profile for a DRIVER-role user. */
    public Driver createDriver(User user) {
        return createDriver(user, DriverStatus.AVAILABLE);
    }

    public Driver createDriver(User user, DriverStatus status) {
        Driver driver = Driver.builder()
                .licenseNumber("DL-" + user.getId() + "-" + System.nanoTime())
                .status(status)
                .user(user)
                .build();
        return driverRepository.save(driver);
    }

    public Vehicle createVehicle(String plateNumber) {
        return createVehicle(plateNumber, VehicleStatus.AVAILABLE, null);
    }

    public Vehicle createVehicle(String plateNumber, VehicleStatus status, Driver driver) {
        Vehicle vehicle = Vehicle.builder()
                .plateNumber(plateNumber)
                .model("Volvo FH16")
                .vehicleType("TRUCK")
                .capacity(new BigDecimal("12000.00"))
                .status(status)
                .driver(driver)
                .build();
        return vehicleRepository.save(vehicle);
    }

    public Shipment createShipment(User sender, User receiver, ShipmentStatus status) {
        return createShipment(sender, receiver, status, null, null);
    }

    public Shipment createShipment(User sender, User receiver, ShipmentStatus status, Driver driver, Vehicle vehicle) {
        Shipment shipment = Shipment.builder()
                .trackingNumber("SLP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .sender(sender)
                .receiver(receiver)
                .driver(driver)
                .vehicle(vehicle)
                .status(status)
                .originStreet("1 Origin Street")
                .originCity("Karachi")
                .originState("Sindh")
                .originCountry("Pakistan")
                .originZip("74000")
                .destStreet("2 Destination Street")
                .destCity("Berlin")
                .destState("Berlin")
                .destCountry("Germany")
                .destZip("10115")
                .weight(new BigDecimal("25.50"))
                .description("Test consignment")
                .build();
        return shipmentRepository.save(shipment);
    }

    public TrackingEvent addTrackingEvent(Shipment shipment, String status, String location) {
        TrackingEvent event = TrackingEvent.builder()
                .shipment(shipment)
                .status(status)
                .location(location)
                .description("Event created by test fixture")
                .build();
        return trackingEventRepository.save(event);
    }

    public Notification createNotification(User user, String title, boolean read) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message("Message for " + title)
                .read(read)
                .build();
        return notificationRepository.save(notification);
    }
}
