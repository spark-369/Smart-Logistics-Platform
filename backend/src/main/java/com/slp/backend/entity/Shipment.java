package com.slp.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shipments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shipment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_number", unique = true, nullable = false, length = 50)
    private String trackingNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShipmentStatus status;

    @Column(name = "origin_street", nullable = false)
    private String originStreet;

    @Column(name = "origin_city", nullable = false)
    private String originCity;

    @Column(name = "origin_state", nullable = false)
    private String originState;

    @Column(name = "origin_country", nullable = false)
    private String originCountry;

    @Column(name = "origin_zip", nullable = false)
    private String originZip;

    @Column(name = "dest_street", nullable = false)
    private String destStreet;

    @Column(name = "dest_city", nullable = false)
    private String destCity;

    @Column(name = "dest_state", nullable = false)
    private String destState;

    @Column(name = "dest_country", nullable = false)
    private String destCountry;

    @Column(name = "dest_zip", nullable = false)
    private String destZip;

    @Column(precision = 10, scale = 2)
    private BigDecimal weight;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "estimated_delivery")
    private LocalDateTime estimatedDelivery;

    @Column(name = "actual_delivery")
    private LocalDateTime actualDelivery;

    @OneToMany(mappedBy = "shipment", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TrackingEvent> trackingEvents = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
