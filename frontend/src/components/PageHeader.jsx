import { Box, Typography } from '@mui/material';

/**
 * Standard page heading used by every route-level page.
 *
 * Guarantees a consistent title/subtitle/actions rhythm across the app, replacing the ad-hoc
 * header markup each page used to roll on its own.
 */
const PageHeader = ({ title, subtitle, overline, actions, icon, divider = false }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'flex-start', sm: 'center' },
      justifyContent: 'space-between',
      gap: 2,
      mb: 3,
      pb: divider ? 2 : 0,
      borderBottom: divider ? '1px solid' : 'none',
      borderColor: 'divider',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
      {icon && (
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: 2,
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        {overline && (
          <Typography variant="overline" color="primary">
            {overline}
          </Typography>
        )}
        <Typography variant="h5" component="h1" noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>

    {actions && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          width: { xs: '100%', sm: 'auto' },
        }}
      >
        {actions}
      </Box>
    )}
  </Box>
);

export default PageHeader;
