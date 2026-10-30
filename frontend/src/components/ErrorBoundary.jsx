import { Component } from 'react';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';
/**
 * Top-level error boundary.
 *
 * A render-time crash anywhere below this component would otherwise unmount the whole SPA and
 * leave the user with a blank page. Instead they get a branded recovery screen with a reload
 * action, and the error is logged for observability.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Kept as console output so it surfaces in the browser and any attached log collector.
    console.error('Unhandled UI error:', error, errorInfo?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            <ErrorIcon color="error" sx={{ fontSize: 56, mb: 1 }} />
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The interface hit an unexpected error. Reloading usually fixes it. If the problem
              persists, contact your platform administrator.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleReload}>
                Reload
              </Button>
              <Button variant="outlined" onClick={() => window.location.assign('/login')}>
                Back to sign in
              </Button>
            </Stack>
            {import.meta.env.DEV && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  mt: 3,
                  p: 2,
                  textAlign: 'left',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 180,
                }}
              >
                {String(error?.stack ?? error?.message ?? error)}
              </Typography>
            )}
          </Paper>
        </Container>
      </Box>
    );
  }
}

export default ErrorBoundary;
