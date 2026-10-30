/**
 * Design tokens for the Smart Logistics Platform UI.
 *
 * Every colour, radius, shadow and gradient the application uses is declared here once so the
 * light and dark themes stay in sync and pages never hardcode hex values.
 */

/** Brand ramp used by both colour schemes. */
export const BRAND = {
  primary: { main: '#1565c0', light: '#5e92f3', dark: '#003c8f', contrastText: '#ffffff' },
  secondary: { main: '#00897b', light: '#4ebaaa', dark: '#005b4f', contrastText: '#ffffff' },
};

/** Domain status colours, keyed by the UPPER_SNAKE enum values sent by the backend. */
export const DOMAIN_COLORS = {
  shipment: {
    PENDING: '#ed6c02',
    ASSIGNED: '#0288d1',
    IN_TRANSIT: '#1565c0',
    DELIVERED: '#2e7d32',
    CANCELLED: '#d32f2f',
  },
  vehicle: {
    AVAILABLE: '#2e7d32',
    IN_USE: '#0288d1',
    MAINTENANCE: '#ed6c02',
  },
  driver: {
    AVAILABLE: '#2e7d32',
    ON_TRIP: '#0288d1',
    INACTIVE: '#757575',
  },
  role: {
    ADMIN: '#d32f2f',
    DISPATCHER: '#ed6c02',
    DRIVER: '#0288d1',
    CUSTOMER: '#616161',
  },
};

/** Fallback palette for charts with an unknown number of series. */
export const CHART_FALLBACK_COLORS = [
  '#1565c0',
  '#00897b',
  '#ed6c02',
  '#d32f2f',
  '#7b1fa2',
  '#0288d1',
  '#2e7d32',
];

/** Reusable gradients for hero surfaces (auth pages, brand panels). */
export const GRADIENTS = {
  brand: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 45%, #00897b 100%)',
  brandDark: 'linear-gradient(135deg, #071c33 0%, #0d47a1 60%, #005b4f 100%)',
  surface: 'linear-gradient(180deg, rgba(21,101,192,0.06) 0%, rgba(21,101,192,0) 100%)',
};

/** Layout constants shared by the shell, sidebar and page containers. */
export const LAYOUT = {
  drawerWidth: 268,
  drawerCollapsedWidth: 76,
  topBarHeight: 64,
  contentMaxWidth: 'xl',
};

/** Persisted colour-scheme preference. */
export const COLOR_MODE_STORAGE_KEY = 'slp.colorMode';
