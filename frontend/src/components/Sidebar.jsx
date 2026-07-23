import { useState } from "react";
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
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  LocalShipping as ShipmentsIcon,
  People as DriversIcon,
  DirectionsCar as VehiclesIcon,
  Person as UsersIcon,
  Notifications as NotificationsIcon,
  ExitToApp as LogoutIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const drawerWidth = 260;

const menuItems = [
  {
    text: "Dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard",
    roles: ["ADMIN", "DISPATCHER"],
  },
  {
    text: "Shipments",
    icon: <ShipmentsIcon />,
    path: "/shipments",
    roles: ["ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER"],
  },
  {
    text: "Drivers",
    icon: <DriversIcon />,
    path: "/drivers",
    roles: ["ADMIN", "DISPATCHER"],
  },
  {
    text: "Vehicles",
    icon: <VehiclesIcon />,
    path: "/vehicles",
    roles: ["ADMIN", "DISPATCHER"],
  },
  { text: "Users", icon: <UsersIcon />, path: "/users", roles: ["ADMIN"] },
  {
    text: "Notifications",
    icon: <NotificationsIcon />,
    path: "/notifications",
    roles: ["ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER"],
  },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <Box>
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ fontWeight: "bold", color: "primary.main" }}
        >
          SLP Logistics
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {user?.role || "User"}
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems
          .filter((item) => item.roles.includes(user?.role))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname.startsWith(item.path)}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "white",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                    "& .MuiListItemIcon-root": {
                      color: "white",
                    },
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            borderRight: "1px solid #e0e0e0",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
