import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Box,
  TextField,
  Alert,
} from '@mui/material';
import { WarningAmber as WarningIcon } from '@mui/icons-material';

/**
 * Confirmation dialog used before destructive actions.
 *
 * Two safety features over a plain confirm:
 *  - the confirm button colour is configurable, so non-destructive confirmations (e.g. unassigning
 *    a driver) do not look like deletions;
 *  - when `requireText` is supplied the user must type it verbatim, which prevents a mis-click from
 *    irreversibly deleting a record.
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  content,
  loading = false,
  confirmLabel = 'Confirm',
  confirmColor = 'error',
  requireText,
  errorMessage,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [typed, setTyped] = useState('');
  const busy = loading || submitting;

  // Reset the typed phrase every time the dialog is (re)opened.
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const locked = Boolean(requireText) && typed.trim() !== requireText;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      disableRestoreFocus
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color={confirmColor === 'error' ? 'error' : 'warning'} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{content}</DialogContentText>

        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
            {errorMessage}
          </Alert>
        )}

        {requireText && (
          <TextField
            autoFocus
            fullWidth
            sx={{ mt: 2 }}
            label={`Type "${requireText}" to confirm`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={busy}
          />
        )}

        {busy && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color={confirmColor}
          variant="contained"
          disabled={busy || locked}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
