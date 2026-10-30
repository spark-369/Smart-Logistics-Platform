import { Card, CardActionArea, Box, Skeleton, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CHART_FALLBACK_COLORS } from '../theme/tokens';

/**
 * Dashboard metric tile.
 *
 * The colour may be a design-token hex (`#1565c0`) or an MUI palette key (`primary`); both are
 * resolved through the theme so light and dark mode stay correct. Clicking the tile can navigate
 * to the filtered list it summarises.
 */
const StatCard = ({ title, value, color = 'primary', icon, loading, hint, onClick }) => {
  const isHex = typeof color === 'string' && color.startsWith('#');
  const fallback = CHART_FALLBACK_COLORS[0];
  const paletteKey = isHex ? 'primary' : color;

  const resolve = (theme) => {
    if (isHex) return color;
    return theme.palette[paletteKey]?.main ?? theme.palette.primary.main ?? fallback;
  };

  const content = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
        {loading ? (
          <Skeleton width={90} height={44} sx={{ mt: 0.5 }} />
        ) : (
          <Typography variant="h4" component="div" sx={{ fontWeight: 700, lineHeight: 1.25, mt: 0.25 }}>
            {value}
          </Typography>
        )}
        {hint && !loading && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>

      {icon && (
        <Box
          sx={(theme) => {
            const tone = resolve(theme);
            return {
              bgcolor: alpha(tone, 0.14),
              color: tone,
              borderRadius: 2,
              p: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            };
          }}
        >
          {icon}
        </Box>
      )}
    </Box>
  );

  const cardSx = (theme) => ({
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: '0 auto 0 0',
      width: 4,
      bgcolor: resolve(theme),
    },
  });

  if (onClick) {
    return (
      <Card sx={cardSx}>
        <Tooltip title={hint ? `${title} — ${hint}` : title} arrow>
          <CardActionArea onClick={onClick} sx={{ p: 2.25, height: '100%' }}>
            {content}
          </CardActionArea>
        </Tooltip>
      </Card>
    );
  }

  return (
    <Card sx={cardSx}>
      <Box sx={{ p: 2.25, height: '100%' }}>{content}</Box>
    </Card>
  );
};

export default StatCard;
