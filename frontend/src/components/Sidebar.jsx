import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Avatar,
  Tooltip,
  Chip,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  LocalShipping as ShipmentsIcon,
  People as DriversIcon,
  DirectionsCar as VehiclesIcon,
  Person as UsersIcon,
  Notifications as NotificationsIcon,
  Timeline as TrackingIcon,
  Logout as LogoutIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
  LocalShipping as BrandIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../theme/ColorModeContext';
import { LAYOUT } from '../theme/tokens';

export const DRAWER_WIDTH = LAYOUT.drawerWidth;
export const DRAWER_COLLAPSED_WIDTH = LAYOUT.drawerCollapsedWidth;

/**
 * Navigation model, grouped so the sidebar reads as sections rather than one long list.
 * `roles` mirrors the route guards in App.jsx — the two must stay in sync.
 */
const MENU_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['ADMIN', 'DISPATCHER'] },
      {
        text: 'Shipments',
        icon: <ShipmentsIcon />,
        path: '/shipments',
        roles: ['ADMIN', 'DISPATCHER', 'DRIVER', 'CUSTOMER'],
      },
      {
        text: 'Tracking',
        icon: <TrackingIcon />,
        path: '/tracking',
        roles: ['ADMIN', 'DISPATCHER', 'DRIVER'],
      },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { text: 'Drivers', icon: <DriversIcon />, path: '/drivers', roles: ['ADMIN', 'DISPATCHER'] },
      { text: 'Vehicles', icon: <VehiclesIcon />, path: '/vehicles', roles: ['ADMIN', 'DISPATCHER'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { text: 'Users', icon: <UsersIcon />, path: '/users', roles: ['ADMIN'] },
      {
        text: 'Notifications',
        icon: <NotificationsIcon />,
        path: '/notifications',
        roles: ['ADMIN', 'DISPATCHER', 'DRIVER', 'CUSTOMER'],
      },
    ],
  },
];

const initialsOf = (user) => {
  const first = user?.firstName?.charAt(0) ?? '';
  const last = user?.lastName?.charAt(0) ?? '';
  return (first + last).toUpperCase() || 'U';
};

/**
 * Primary navigation.
 *
 * Renders a permanent, collapsible drawer on desktop and a temporary overlay drawer on mobile.
 * The collapsed state hides labels but keeps every control reachable through a tooltip, which
 * matters on 1280px laptops where the table pages need the horizontal room.
 */
const Sidebar = ({ mobileOpen = false, onClose, collapsed = false, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode } = useColorMode();

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate('/login', { replace: true });
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#ffffff' }}>
      {/* Brand header */}
      <Box
        sx={{
          px: collapsed ? 1 : 2,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minHeight: LAYOUT.topBarHeight,
        }}
      >
        <Avatar
          sx={{ bgcolor: alpha('#ffffff', 0.16), color: '#ffffff', width: 40, height: 40, flexShrink: 0 }}
        >
          <BrandIcon fontSize="small" />
        </Avatar>
        {!collapsed && (
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              SLP Logistics
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.65) }} noWrap>
              Smart Logistics Platform
            </Typography>
          </Box>
        )}
        {!collapsed && onToggleCollapse && (
          <Tooltip title="Collapse menu">
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              aria-label="Collapse navigation"
              sx={{ color: alpha('#ffffff', 0.75), display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <CollapseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ borderColor: alpha('#ffffff', 0.12) }} />

      {/* Sections */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1, py: 1.5 }}>
        {MENU_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => item.roles.includes(user?.role));
          if (visible.length === 0) return null;

          return (
            <Box key={section.label} sx={{ mb: 1.5 }}>
              {!collapsed && (
                <Typography
                  variant="overline"
                  sx={{
                    px: 1.5,
                    color: alpha('#ffffff', 0.55),
                    fontSize: '0.68rem',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  {section.label}
                </Typography>
              )}
              <List disablePadding>
                {visible.map((item) => {
                  const selected = isActive(item.path);
                  return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                      <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
                        <ListItemButton
                          selected={selected}
                          onClick={() => go(item.path)}
                          aria-current={selected ? 'page' : undefined}
                          sx={{
                            borderRadius: 2,
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            px: collapsed ? 1 : 1.5,
                            color: alpha('#ffffff', 0.82),
                            '&:hover': { bgcolor: alpha('#ffffff', 0.10), color: '#ffffff' },
                            '&.Mui-selected': {
                              bgcolor: alpha('#ffffff', 0.18),
                              color: '#ffffff',
                              '&:hover': { bgcolor: alpha('#ffffff', 0.24) },
                              '& .MuiListItemIcon-root': { color: '#ffffff' },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{ minWidth: collapsed ? 0 : 38, color: 'inherit', justifyContent: 'center' }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          {!collapsed && (
                            <ListItemText
                              primary={item.text}
                              primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                            />
                          )}
                        </ListItemButton>
                      </Tooltip>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: alpha('#ffffff', 0.12) }} />

      {/* Account footer */}
      <Box sx={{ p: collapsed ? 1 : 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 1,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: 14,
              bgcolor: alpha('#ffffff', 0.18),
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            {initialsOf(user)}
          </Avatar>
          {!collapsed && (
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" noWrap sx={{ color: alpha('#ffffff', 0.65) }}>
                {user?.email}
              </Typography>
            </Box>
          )}
        </Box>

        {!collapsed && (
          <Chip
            size="small"
            label={user?.role ?? 'UNKNOWN'}
            sx={{
              mb: 1,
              bgcolor: alpha('#ffffff', 0.14),
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
          />
        )}

        <Tooltip title={collapsed ? 'Sign out' : ''} placement="right" arrow>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              px: collapsed ? 1 : 1.5,
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: '#ff8a80',
              '&:hover': { bgcolor: alpha('#ffffff', 0.10) },
            }}
          >
            <ListItemIcon
              sx={{ minWidth: collapsed ? 0 : 38, color: 'inherit', justifyContent: 'center' }}
            >
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Sign out"
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
              />
            )}
          </ListItemButton>
        </Tooltip>

        {collapsed && onToggleCollapse && (
          <Tooltip title="Expand menu" placement="right" arrow>
            <ListItemButton
              onClick={onToggleCollapse}
              aria-label="Expand navigation"
              sx={{ mt: 0.5, borderRadius: 2, justifyContent: 'center', color: alpha('#ffffff', 0.75) }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
                <ExpandIcon fontSize="small" />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        )}

        {!collapsed && (
          <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.45), mt: 1, display: 'block' }}>
            v1.0 · {mode} theme
          </Typography>
        )}
      </Box>
    </Box>
  );

  const width = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box
      component="nav"
      sx={{ width: { sm: width }, flexShrink: { sm: 0 }, transition: 'width 200ms' }}
      aria-label="Main navigation"
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width,
            transition: 'width 200ms',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
