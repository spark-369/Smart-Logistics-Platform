export const ShipmentStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

export const VehicleStatus = {
  AVAILABLE: 'AVAILABLE',
  IN_USE: 'IN_USE',
  MAINTENANCE: 'MAINTENANCE',
};

/**
 * Mirrors com.slp.backend.entity.DriverStatus.
 * NOTE: the backend previously used a free-form "ACTIVE" string; it is now an enum whose
 * assignable value is AVAILABLE, which is what the UI compares against.
 */
export const DriverStatus = {
  AVAILABLE: 'AVAILABLE',
  ON_TRIP: 'ON_TRIP',
  INACTIVE: 'INACTIVE',
};

export const UserRole = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  DISPATCHER: 'DISPATCHER',
};

export const SHIPMENT_STATUSES = Object.values(ShipmentStatus);
export const DRIVER_STATUSES = Object.values(DriverStatus);
export const VEHICLE_STATUSES = Object.values(VehicleStatus);
export const USER_ROLES = Object.values(UserRole);

/** MUI Chip colours keyed by shipment status. */
export const SHIPMENT_STATUS_COLORS = {
  [ShipmentStatus.PENDING]: 'warning',
  [ShipmentStatus.ASSIGNED]: 'info',
  [ShipmentStatus.IN_TRANSIT]: 'primary',
  [ShipmentStatus.DELIVERED]: 'success',
  [ShipmentStatus.CANCELLED]: 'error',
};

export const VEHICLE_STATUS_COLORS = {
  [VehicleStatus.AVAILABLE]: 'success',
  [VehicleStatus.IN_USE]: 'info',
  [VehicleStatus.MAINTENANCE]: 'warning',
};

export const DRIVER_STATUS_COLORS = {
  [DriverStatus.AVAILABLE]: 'success',
  [DriverStatus.ON_TRIP]: 'info',
  [DriverStatus.INACTIVE]: 'default',
};

export const USER_ROLE_COLORS = {
  [UserRole.ADMIN]: 'error',
  [UserRole.DISPATCHER]: 'warning',
  [UserRole.DRIVER]: 'info',
  [UserRole.CUSTOMER]: 'default',
};

/** Human readable label for an UPPER_SNAKE enum value. */
export const humanize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Which domain a status value belongs to.
 * Used by `StatusChip` so a status is coloured from the shared design tokens rather than an
 * arbitrary MUI colour name chosen per page.
 */
export const STATUS_DOMAIN = {
  shipment: 'shipment',
  vehicle: 'vehicle',
  driver: 'driver',
  role: 'role',
};

/**
 * Maps a shipment status to the closest MUI palette colour, kept for components that still pass a
 * colour name to MUI rather than a token.
 */
export const SHIPMENT_STATUS_MUI_COLOR = {
  [ShipmentStatus.PENDING]: 'warning',
  [ShipmentStatus.ASSIGNED]: 'info',
  [ShipmentStatus.IN_TRANSIT]: 'primary',
  [ShipmentStatus.DELIVERED]: 'success',
  [ShipmentStatus.CANCELLED]: 'error',
};

/**
 * Human-readable label for a status, with a fallback for null/undefined.
 * Mirrors `humanize` but never renders the literal string "undefined".
 */
export const statusLabel = (value) => (value ? humanize(value) : 'Unknown');
