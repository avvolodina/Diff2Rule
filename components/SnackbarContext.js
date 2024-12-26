import React, { createContext, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const SnackbarContext = createContext();

export const SnackbarProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const showSnackbar = (message, severity) => {
    setMessage(message);
    setSeverity(severity);
    setOpen(true);
  };

  const showInfo = (message) => showSnackbar(message, 'info');
  const showSuccess = (message) => showSnackbar(message, 'success');
  const showWarning = (message) => showSnackbar(message, 'warning');
  const showError = (message) => showSnackbar(message, 'error');

  return (
    <SnackbarContext.Provider value={{ showSnackbar, showInfo, showSuccess, showWarning, showError }}>
      {children}
      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
        <Alert onClose={handleClose} severity={severity}>
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
