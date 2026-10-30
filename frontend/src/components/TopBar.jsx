import { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Tooltip,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../theme/ColorModeContext';
import { useFeedback } from './FeedbackProvider';
import { notificationService } from '../services/notificationService';
import { LAYOUT } from '../theme/tokens';

const UNREAD_POLL_INTERVAL_MS = 60000;

/** Maps a URL segment to the label shown in the breadcrumb trail. */
const SEGMENT_LABELS = {
  dashboard: 'Dashboard',
  shipments: 'Shipments',
  create: 'New shipment',
  edit: 'Edit',
  tracking: 'Tracking',
  drivers: 'Drivers',
  vehicles: 'Vehicles',
  users: 'Users',
  notifications: 'Notifications',
};

/**
 * Top application bar.
 *
 * Beyond the original hamburger + avatar, this now carries a breadcrumb trail (so deep pages like
 * /shipments/42/edit are locatable), a light/dark toggle, and a live unread-notification badge that
 * reports polling failures to the user instead of swallowing them.
 */
const TopBar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { mode, toggle } = useColorMode();
  const { notifyError } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pollFailed, setPollFailed] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(Number(count) || 0);
      setPollFailed(false);
    } catch {
      // The badge is non-critical, but repeated silent failures hid a broken token for a whole
      // session. Surface it once per outage instead of on every poll.
      setPollFailed((alreadyReported) => {
        if (!alreadyReported) {
          notifyError('Unable to refresh the notification badge. Some updates may be missing.');
        }
        return true;
      });
    }
  }, [user?.id, notifyError]);

  useEffect(() => {
    loadUnreadCount();
    const timer = setInterval(loadUnreadCount, UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadUnreadCount]);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login', { replace: true });
  };

  const initials =
    `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase() || 'U';

  // Build a breadcrumb trail from the pathname, labelling opaque numeric ids as "#42".
  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs = segments.map((segment, index) => ({
    label: SEGMENT_LABELS[segment] ?? (/^\d+$/.test(segment) ? `#${segment}` : segment),
    to: `/${segments.slice(0, index + 1).join('/')}`,
  }));

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(8px)',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: `${LAYOUT.topBarHeight}px !important` }}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="Open navigation menu"
          sx={{ display: { sm: 'none' } }}
          onClick={onMenuClick}
        >
          <MenuIcon />
        </IconButton>

        {/* Breadcrumbs on desktop, user identity on mobile */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: { xs: 'none', md: 'block' } }}>
          <Breadcrumbs
            separator={<ChevronRightIcon sx={{ fontSize: 16 }} />}
            aria-label="Breadcrumb"
            sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
          >
            <MuiLink
              component={RouterLink}
              to="/"
              underline="hover"
              color="inherit"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}
            >
              <HomeIcon sx={{ fontSize: 16 }} />
              Home
            </MuiLink>
            {crumbs.map((crumb, index) =>
              index === crumbs.length - 1 ? (
                <Typography
                  key={crumb.to}
                  color="text.primary"
                  sx={{ fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {crumb.label}
                </Typography>
              ) : (
                <MuiLink
                  key={crumb.to}
                  component={RouterLink}
                  to={crumb.to}
                  underline="hover"
                  color="inherit"
                  sx={{ fontSize: '0.85rem' }}
                >
                  {crumb.label}
                </MuiLink>
              ),
            )}
          </Breadcrumbs>
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0, display: { xs: 'block', md: 'none' } }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.role}
          </Typography>
        </Box>

        <Chip
          size="small"
          label={user?.role}
          color="primary"
          variant="outlined"
          sx={{ display: { xs: 'none', lg: 'inline-flex' }, fontWeight: 700 }}
        />

        <Tooltip title={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          <IconButton color="inherit" onClick={toggle} aria-label="Toggle colour theme">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton
            color="inherit"
            onClick={() => navigate('/notifications')}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Account">
          <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ width: 34, height: 34, fontSize: 15, bgcolor: 'primary.main' }}>
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 260 } } }}
        >
          <MenuItem disabled sx={{ opacity: '1 !important' }}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate('/notifications');
            }}
          >
            <ListItemIcon>
              <NotificationsIcon fontSize="small" />
            </ListItemIcon>
            Notifications
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>

      {/* Persistent, non-blocking warning when the badge cannot be refreshed. */}
      {pollFailed && (
        <Box
          sx={{
            px: 2,
            py: 0.25,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption">
            Notification badge could not be refreshed — showing the last known count.
          </Typography>
        </Box>
      )}
    </AppBar>
  );
};

export default TopBar;

