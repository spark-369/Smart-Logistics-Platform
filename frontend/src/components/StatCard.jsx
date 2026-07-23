import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';

const StatCard = ({ title, value, color, icon, loading }) => {
  return (
    <Card sx={{ height: '100%', boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={40} />
            ) : (
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
                {value}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
