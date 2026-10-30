import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Typography, Container, alpha } from '@mui/material';
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from './Sidebar';
import TopBar from './TopBar';
import { LAYOUT } from '../theme/tokens';

const COLLAPSE_STORAGE_KEY = 'slp.sidebarCollapsed';

/** Reads the persisted sidebar collapse preference, defaulting to expanded. */
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Application shell: a permanent drawer on desktop and a temporary drawer on mobile.
 *
 * The open/close state lives here so the TopBar hamburger actually controls the Sidebar — it
 * previously did nothing, leaving navigation completely unusable on small screens. The desktop
 * drawer can also collapse to an icon rail, and that choice survives a reload.
 */
const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
    } catch {
      // Preference persistence is best-effort.
    }
  }, [collapsed]);

  const handleDrawerToggle = () => setMobileOpen((open) => !open);
  const handleDrawerClose = () => setMobileOpen(false);
  const handleToggleCollapse = () => setCollapsed((value) => !value);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={handleDrawerClose}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <Box
        component="div"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: {
            sm: `calc(100% - ${collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH}px)`,
          },
          transition: 'width 200ms',
        }}
      >
        <TopBar onMenuClick={handleDrawerToggle} />

        <Box
          component="main"
          sx={{ flexGrow: 1, py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, overflow: 'auto' }}
        >
          <Container
            maxWidth={LAYOUT.contentMaxWidth}
            disableGutters
            sx={{ height: '100%' }}
          >
            <Outlet />
          </Container>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 1.5,
            px: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.6),
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Smart Logistics Platform · v1.0 — shipment, fleet and tracking operations
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
