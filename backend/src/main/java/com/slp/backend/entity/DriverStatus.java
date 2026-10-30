package com.slp.backend.entity;

/**
 * Lifecycle state of a {@link Driver}.
 *
 * <p>Modelled as an enum (rather than a free-form {@code String}) so that invalid values are
 * rejected at the API boundary and the UI can rely on a closed set of options.
 */
public enum DriverStatus {
    /** Eligible for assignment to a vehicle and shipments. */
    AVAILABLE,
    /** Currently assigned to a vehicle. */
    ON_TRIP,
    /** Not available (leave, suspension). */
    INACTIVE
}
