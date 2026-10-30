import { Chip, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DOMAIN_COLORS, CHART_FALLBACK_COLORS } from '../theme/tokens';
import { humanize } from '../constants';

/**
 * Colour-aware status pill.
 *
 * Reads its colour from the shared token map instead of a per-page MUI colour name, so a status
 * renders identically on the dashboard, the list tables and the detail views. Unknown values fall
 * back to a neutral chip rather than crashing.
 */
const StatusChip = ({ value, domain = 'shipment', size = 'small', variant = 'soft', label, icon, sx }) => {
  const palette = DOMAIN_COLORS[domain] ?? {};
  const hex = palette[value] ?? CHART_FALLBACK_COLORS[0];
  const isSoft = variant === 'soft';

  return (
    <Tooltip title={String(value ?? '')} disableHoverListener={!value}>
      <Chip
        size={size}
        label={label ?? humanize(value)}
        icon={icon}
        sx={{
          fontWeight: 600,
          borderColor: hex,
          color: isSoft ? hex : '#ffffff',
          bgcolor: isSoft ? alpha(hex, 0.12) : hex,
          '& .MuiChip-icon': { color: 'inherit' },
          ...sx,
        }}
        variant={isSoft ? 'filled' : 'outlined'}
      />
    </Tooltip>
  );
};

export default StatusChip;
