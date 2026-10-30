import { Card, CardContent, CardHeader, Divider, Box, Typography } from '@mui/material';

/**
 * Bordered content surface with an optional title, subtitle and header action.
 *
 * Wraps the repeated `<Card><CardContent>` scaffolding so panels across the app share identical
 * padding, borders and heading hierarchy.
 */
const SectionCard = ({
  title,
  subtitle,
  action,
  children,
  contentSx,
  disablePadding = false,
  sx,
}) => {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      {hasHeader && (
        <>
          <CardHeader
            title={title}
            subheader={subtitle}
            titleTypographyProps={{ variant: 'subtitle1' }}
            subheaderTypographyProps={{ variant: 'body2' }}
            action={action}
            sx={{ px: { xs: 2, sm: 2.5 }, py: 1.75, alignItems: 'flex-start' }}
          />
          <Divider />
        </>
      )}
      {disablePadding ? (
        <Box sx={{ flexGrow: 1, minWidth: 0, ...contentSx }}>{children}</Box>
      ) : (
        <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: 2.5 }, ...contentSx }}>
          {children}
        </CardContent>
      )}
    </Card>
  );
};

/** Small labelled value used inside detail panels. */
export const DetailItem = ({ label, value, icon, span = 12 }) => (
  <Box sx={{ gridColumn: { xs: 'span 12', sm: `span ${span}` }, minWidth: 0 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}
    >
      {icon}
      {label}
    </Typography>
    <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
      {value}
    </Typography>
  </Box>
);

export default SectionCard;
