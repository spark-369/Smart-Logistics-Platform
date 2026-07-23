import { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Inventory2 as ShipmentsIcon,
  PendingActions as PendingIcon,
  LocalShipping as InTransitIcon,
  CheckCircle as DeliveredIcon,
  People as UsersIcon,
  DirectionsCar as DriversIcon,
} from "@mui/icons-material";
import StatCard from "../components/StatCard";
import { dashboardService } from "../services/dashboardService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#0088fe", "#00c49f", "#ffbb28", "#ff8042", "#8884d8"];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      setError("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const chartData = stats?.shipmentsByStatus
    ? Object.entries(stats.shipmentsByStatus).map(([key, value]) => ({
        name: key,
        value: Number(value),
      }))
    : [];


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Total Shipments"
            value={stats?.totalShipments || 0}
            color="primary"
            icon={<ShipmentsIcon />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Pending"
            value={stats?.pendingShipments || 0}
            color="warning"
            icon={<PendingIcon />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="In Transit"
            value={stats?.inTransitShipments || 0}
            color="info"
            icon={<InTransitIcon />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Delivered"
            value={stats?.deliveredShipments || 0}
            color="success"
            icon={<DeliveredIcon />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            color="secondary"
            icon={<UsersIcon />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            title="Total Drivers"
            value={stats?.totalDrivers || 0}
            color="primary"
            icon={<DriversIcon />}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 400, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom>
              Shipments Status Breakdown
            </Typography>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 320,
                }}
              >
                <Typography color="textSecondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 400, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom>
              Shipments by Status
            </Typography>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 320,
                }}
              >
                <Typography color="textSecondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
