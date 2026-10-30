import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const FeedbackContext = createContext(null);

const AUTO_HIDE_MS = 5000;

/**
 * Application-wide toast notifications.
 *
 * Replaces the previous pattern of `console.error` / silent failures: every mutation now reports
 * success or failure through a single, consistent channel instead of being invisible to the user.
 *
 * Usage: `const { notifySuccess, notifyError } = useFeedback();`
 */
export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, severity) => {
      if (!message) return;
      // Date.now() keeps ids unique without pulling in a uuid dependency.
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, message, severity }]);
      return id;
    },
    [],
  );

  const value = useMemo(
    () => ({
      notifySuccess: (message) => push(message, 'success'),
      notifyError: (message) => push(message, 'error'),
      notifyInfo: (message) => push(message, 'info'),
      notifyWarning: (message) => push(message, 'warning'),
    }),
    [push],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open
          autoHideDuration={AUTO_HIDE_MS}
          onClose={() => dismiss(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          // Stack multiple toasts instead of overlapping them.
          sx={{ mb: index * 7 }}
        >
          <Alert
            onClose={() => dismiss(toast.id)}
            severity={toast.severity}
            variant="filled"
            elevation={6}
            sx={{ width: '100%', whiteSpace: 'pre-line' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside a <FeedbackProvider>');
  }
  return context;
};
