/**
 * Shared helpers for turning API errors and raw values into UI-ready text.
 */

/**
 * Extracts the most useful human readable message from an axios error.
 *
 * The backend always answers with { success, message, data } and uses `data` to carry
 * per-field validation errors, so both shapes are handled here.
 */
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;

  const payload = error.response?.data;

  // Field level validation errors -> "originCity: Origin city is required"
  if (payload?.data && typeof payload.data === 'object') {
    const entries = Object.entries(payload.data);
    if (entries.length > 0) {
      return entries.map(([field, message]) => `${field}: ${message}`).join('\n');
    }
  }

  if (payload?.message) return payload.message;

  // Network/timeout errors have no response at all.
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The request timed out. Please try again.'
      : 'Cannot reach the server. Check your connection and try again.';
  }

  return fallback;
};

/** Formats an ISO timestamp for display, tolerating null/undefined. */
export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

/** Formats a date-only value for display. */
export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

/** Renders a value or an em dash placeholder. */
export const orDash = (value) =>
  value === null || value === undefined || value === '' ? '—' : value;

/** Formats a decimal weight value with its unit. */
export const formatWeight = (value) =>
  value === null || value === undefined ? '—' : `${Number(value).toLocaleString()} kg`;

/** Extracts the response body of a paginated Spring Data endpoint. */
export const unwrapPage = (data) => ({
  content: data?.content ?? [],
  totalElements: data?.totalElements ?? 0,
  totalPages: data?.totalPages ?? 0,
});
