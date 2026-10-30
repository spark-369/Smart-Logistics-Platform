import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { COLOR_MODE_STORAGE_KEY } from './tokens';
import { createAppTheme } from './index';

const ColorModeContext = createContext({ mode: 'light', toggle: () => {} });

/**
 * Reads the persisted colour scheme, falling back to the OS preference.
 * Wrapped in try/catch because `matchMedia` is unavailable in some test/SSR environments.
 */
const readInitialMode = () => {
  try {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // localStorage disabled (private mode) or no matchMedia: default to light.
  }
  return 'light';
};

/**
 * Provides the light/dark theme to the whole application and exposes a toggle so the TopBar can
 * flip the scheme. The choice is persisted across reloads.
 */
export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(readInitialMode);

  useEffect(() => {
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    } catch {
      // Persisting the preference is best-effort only.
    }
    // Keeps native form controls / scrollbars in step with the app theme.
    if (typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = mode;
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((current) => (current === 'light' ? 'dark' : 'light')), []);

  const value = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle]);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export const useColorMode = () => useContext(ColorModeContext);
