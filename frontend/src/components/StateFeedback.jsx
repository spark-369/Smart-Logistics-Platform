import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Inbox as InboxIcon, CloudOff as CloudOffIcon } from '@mui/icons-material';

/**
 * Centred spinner used while a page or panel is loading.
 */
export const LoadingState = ({ message = 'Loading…', minHeight = 240 }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minHeight,
      width: '100%',
    }}
    role="status"
    aria-live="polite"
  >
    <CircularProgress />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

/** Thin indeterminate bar pinned above a panel during a background refresh. */
export const InlineLoading = ({ active }) => (
  <Box sx={{ height: 4, mb: active ? 1 : 0 }}>
    {active && <LinearProgress aria-label="Refreshing" />}
  </Box>
);

/**
 * Skeleton placeholder matching the shape of a data table, so the layout does not jump when the
 * real rows arrive (a plain spinner causes a visible reflow).
 */
export const TableSkeleton = ({ rows = 6, columns = 5 }) => (
  <Box sx={{ width: '100%' }} aria-busy="true" aria-label="Loading data">
    <Table size="small">
      <TableHead>
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableCell key={`head-${index}`}>
              <Skeleton width={index === 0 ? 90 : 70} />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={`row-${rowIndex}`}>
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <TableCell key={`cell-${rowIndex}-${columnIndex}`}>
                <Skeleton width={columnIndex === 0 ? '70%' : '55%'} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
);

/** Skeleton grid used by the dashboard while statistics load. */
export const CardGridSkeleton = ({ count = 6, minHeight = 120 }) => (
  <Box
    sx={{
      display: 'grid',
      gap: 3,
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
    }}
    aria-busy="true"
  >
    {Array.from({ length: count }).map((_, index) => (
      <Paper key={`card-${index}`} sx={{ p: 2.5, minHeight }}>
        <Skeleton width="45%" height={18} />
        <Skeleton width="65%" height={40} sx={{ my: 1 }} />
        <Skeleton width="35%" height={14} />
      </Paper>
    ))}
  </Box>
);

/**
 * Friendly empty state for tables and lists, optionally with a call to action.
 */
export const EmptyState = ({
  title = 'Nothing here yet',
  description,
  icon,
  actionLabel,
  onAction,
  minHeight = 200,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      py: 6,
      px: 2,
      minHeight,
      textAlign: 'center',
      color: 'text.secondary',
    }}
  >
    {icon ?? <InboxIcon sx={{ fontSize: 48, opacity: 0.4 }} />}
    <Typography variant="h6" color="text.primary">
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" sx={{ maxWidth: 420 }}>
        {description}
      </Typography>
    )}
    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
        {actionLabel}
      </Button>
    )}
  </Box>
);

/**
 * Inline error banner with an optional retry affordance.
 *
 * `whiteSpace: pre-line` is deliberate: `getErrorMessage` joins field-level validation failures
 * with newlines so each one appears on its own line.
 */
export const ErrorState = ({ message, onRetry, actionLabel = 'Retry', title }) => {
  if (!message) return null;
  return (
    <Alert
      severity="error"
      icon={title ? <CloudOffIcon /> : undefined}
      sx={{ mb: 2, whiteSpace: 'pre-line' }}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    >
      {title && (
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      )}
      {message}
    </Alert>
  );
};

/** Neutral informational panel used for read-only notices. */
export const InfoPanel = ({ title, children, icon, action }) => (
  <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
    {icon}
    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
      {title && (
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
    {action && <Stack sx={{ flexShrink: 0 }}>{action}</Stack>}
  </Paper>
);
