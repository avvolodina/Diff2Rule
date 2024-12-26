import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  components: {
    MuiIconButton: {
      styleOverrides: {
        // Name of the slot
        root: {
          // Make disabled icon buttons light gray
          '&:disabled': {
            color: 'rgba(0, 0, 0, 0.26)',
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
  },
});

export default theme;
