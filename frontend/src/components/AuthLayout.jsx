import { Box, Typography, Paper, Stack, Chip, alpha } from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Inventory2 as ShipmentsIcon,
  Timeline as TrackingIcon,
  DirectionsCar as FleetIcon,
} from '@mui/icons-material';
import { GRADIENTS } from '../theme/tokens';

const HIGHLIGHTS = [
  { icon: <ShipmentsIcon fontSize="small" />, text: 'Book and manage shipments end to end' },
  { icon: <TrackingIcon fontSize="small" />, text: 'Live tracking events and journey history' },
  { icon: <FleetIcon fontSize="small" />, text: 'Driver and fleet assignment in one place' },
];

const ROLES = ['ADMIN', 'DISPATCHER', 'DRIVER', 'CUSTOMER'];

/** Branded marketing panel shown beside the form on wide screens. */
const BrandPanel = () => (
  <Box
    sx={{
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: 5,
      color: '#ffffff',
      backgroundImage: GRADIENTS.brand,
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha('#ffffff', 0.18),
        }}
      >
        <ShippingIcon />
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
          SLP Logistics
        </Typography>
        <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.75) }}>
          Smart Logistics Platform
        </Typography>
      </Box>
    </Stack>

    <Box>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1.5, lineHeight: 1.15 }}>
        Move freight with
        <br />
        total visibility.
      </Typography>
      <Typography variant="body1" sx={{ color: alpha('#ffffff', 0.82), mb: 3, maxWidth: 420 }}>
        One platform for dispatch, drivers, vehicles and customer-facing tracking — with role-based
        access for every team.
      </Typography>
      <Stack spacing={1.5}>
        {HIGHLIGHTS.map((item) => (
          <Stack key={item.text} direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha('#ffffff', 0.16),
                flexShrink: 0,
              }}
            >
              {item.icon}
            </Box>
            <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.9) }}>
              {item.text}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>

    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {ROLES.map((role) => (
        <Chip
          key={role}
          size="small"
          label={role}
          sx={{ bgcolor: alpha('#ffffff', 0.16), color: '#ffffff', fontWeight: 700 }}
        />
      ))}
    </Stack>
  </Box>
);

/**
 * Split-screen shell for the public auth pages.
 *
 * Keeps Login and Register visually identical (branded panel on the left, form card on the right)
 * without duplicating the marketing markup in both files.
 */
const AuthLayout = ({ children, maxWidth = 440 }) => (
  <Box
    sx={{
      display: 'grid',
      width: '100%',
      minHeight: '100vh',
      bgcolor: 'background.default',
      gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
    }}
  >
    <BrandPanel />

    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Paper sx={{ width: '100%', maxWidth, p: { xs: 3, sm: 4 } }}>{children}</Paper>
    </Box>
  </Box>
);

/** Compact brand mark used on narrow screens where the marketing panel is hidden. */
export const AuthBrandMark = ({ subtitle }) => (
  <Box sx={{ textAlign: 'center', mb: 3 }}>
    <Box
      sx={{
        display: { xs: 'inline-flex', md: 'none' },
        width: 52,
        height: 52,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        mb: 1.5,
      }}
    >
      <ShippingIcon />
    </Box>
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Box>
);

export default AuthLayout;
