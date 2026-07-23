import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { shipmentService } from "../services/shipmentService";
import { userService } from "../services/userService";
import { vehicleService } from "../services/vehicleService";

const ShipmentCreate = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isDispatcher } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    senderId: "",
    receiverId: "",
    originStreet: "",
    originCity: "",
    originState: "",
    originCountry: "",
    originZip: "",
    destStreet: "",
    destCity: "",
    destState: "",
    destCountry: "",
    destZip: "",
    weight: "",
    description: "",
    vehicleId: "",
  });

  useEffect(() => {
    if (users.length > 0 && user?.id) {
      setFormData((prev) => ({ ...prev, senderId: String(user.id) }));
    }
  }, [users, user]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await userService.getLookup();
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const data = await vehicleService.getAssignable(0, 100);
      setVehicles(data.content || []);
    } catch (err) {
      console.error("Failed to load vehicles");
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    if (isAdmin() || isDispatcher()) {
      loadVehicles();
    }
  }, [loadUsers, loadVehicles, isAdmin, isDispatcher]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...formData,
        senderId: Number(formData.senderId),
        receiverId: Number(formData.receiverId),
        weight: formData.weight ? Number(formData.weight) : null,
        vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null,
      };
      await shipmentService.create(payload);
      navigate("/shipments");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create shipment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/shipments")}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          Create Shipment
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4, boxShadow: 2 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ mt: 2, mb: 2, color: "primary.main" }}
          >
            Sender & Receiver
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Sender</InputLabel>
                <Select
                  name="senderId"
                  value={formData.senderId}
                  onChange={handleChange}
                  label="Sender"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Receiver</InputLabel>
                <Select
                  name="receiverId"
                  value={formData.receiverId}
                  onChange={handleChange}
                  label="Receiver"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {(isAdmin() || isDispatcher()) && (
            <>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ mt: 4, mb: 2, color: "primary.main" }}
              >
                Vehicle
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Assign Vehicle (optional)</InputLabel>
                    <Select
                      name="vehicleId"
                      value={formData.vehicleId}
                      onChange={handleChange}
                      label="Assign Vehicle (optional)"
                    >
                      <MenuItem value="">None</MenuItem>
                      {vehicles.map((vehicle) => (
                        <MenuItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plateNumber} - {vehicle.model}{" "}
                          {vehicle.driverName
                            ? `(${vehicle.driverName})`
                            : "(No driver)"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </>
          )}

          <Typography
            variant="h6"
            gutterBottom
            sx={{ mt: 4, mb: 2, color: "primary.main" }}
          >
            Origin Address
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="originStreet"
                label="Street"
                value={formData.originStreet}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="originCity"
                label="City"
                value={formData.originCity}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="originState"
                label="State"
                value={formData.originState}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="originCountry"
                label="Country"
                value={formData.originCountry}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="originZip"
                label="Zip Code"
                value={formData.originZip}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
          </Grid>

          <Typography
            variant="h6"
            gutterBottom
            sx={{ mt: 4, mb: 2, color: "primary.main" }}
          >
            Destination Address
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="destStreet"
                label="Street"
                value={formData.destStreet}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="destCity"
                label="City"
                value={formData.destCity}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="destState"
                label="State"
                value={formData.destState}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="destCountry"
                label="Country"
                value={formData.destCountry}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="destZip"
                label="Zip Code"
                value={formData.destZip}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
          </Grid>

          <Typography
            variant="h6"
            gutterBottom
            sx={{ mt: 4, mb: 2, color: "primary.main" }}
          >
            Additional Details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                name="weight"
                label="Weight (kg)"
                type="number"
                value={formData.weight}
                onChange={handleChange}
                fullWidth
                inputProps={{ min: 0, step: "0.01" }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>

          <Box
            sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}
          >
            <Button variant="outlined" onClick={() => navigate("/shipments")}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : "Create Shipment"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ShipmentCreate;
