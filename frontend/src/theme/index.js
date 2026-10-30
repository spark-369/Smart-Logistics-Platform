import { createTheme, alpha } from '@mui/material/styles';
import { BRAND, GRADIENTS, LAYOUT } from './tokens';

/**
 * Central MUI theme factory.
 *
 * `createAppTheme(mode)` builds either the light or the dark scheme from the shared design tokens
 * so the two modes never drift apart. Kept in its own module so pages, components and tests share
 * one source of truth instead of each re-declaring a theme inline.
 */
export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: BRAND.primary,
      secondary: BRAND.secondary,
      background: isDark
        ? { default: '#0b1220', paper: '#131c2e' }
        : { default: '#f4f6fb', paper: '#ffffff' },
      text: isDark
        ? { primary: '#e8edf7', secondary: '#9aa8c0' }
        : { primary: '#152238', secondary: '#5b6b86' },
      divider: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(21,34,56,0.10)',
      success: { main: isDark ? '#4caf50' : '#2e7d32' },
      warning: { main: isDark ? '#ffa726' : '#ed6c02' },
      error: { main: isDark ? '#ef5350' : '#d32f2f' },
      info: { main: isDark ? '#42a5f5' : '#0288d1' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: '0.08em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark ? GRADIENTS.brandDark : GRADIENTS.surface,
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            backgroundSize: '100% 420px',
          },
          '::selection': { backgroundColor: alpha(BRAND.primary.main, 0.25) },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(21,34,56,0.20)',
            borderRadius: 8,
          },
          '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, paddingInline: 18 },
          sizeLarge: { paddingBlock: 10 },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(21,34,56,0.10)',
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { rounded: { borderRadius: 12 } },
      },
      MuiAppBar: { defaultProps: { elevation: 0 } },
      MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            whiteSpace: 'nowrap',
            fontSize: '0.78rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: isDark ? '#9aa8c0' : '#5b6b86',
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafd',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:last-of-type .MuiTableCell-root': { borderBottom: 'none' } },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 }, sizeSmall: { height: 24 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 14, backgroundImage: 'none' } } },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: isDark ? GRADIENTS.brandDark : 'none',
            backgroundColor: isDark ? '#0d1526' : '#0d2b52',
            color: '#ffffff',
            borderRight: 'none',
          },
        },
      },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: { root: { borderRadius: 6 } },
      },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 6, height: 6 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    },
  });
};

/** Layout constants re-exported so consumers can import them from the theme module. */
export { LAYOUT };

/** Default (light) theme. */
const theme = createAppTheme('light');

export default theme;
