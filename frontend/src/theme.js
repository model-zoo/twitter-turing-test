import { createMuiTheme } from '@material-ui/core';
import { colors } from '@material-ui/core';

const white = '#FFFFFF';
const black = '#000000';

// https://coolors.co/8bc34a-f6fedb-e6d3a3-d8d174-91972a

const theme = createMuiTheme({
  palette: {
    black,
    white,
    primary: {
      main: '#e94f37',
      light: '#ff8263',
      dark: '#b0130d'
    },
    secondary: {
      main: '#393e41',
      light: '#63686c',
      dark: '#13181b'
    },
    success: {
      contrastText: black,
      dark: '#567d2e',
      main: '#7cb342',
      light: '#96c267'
    },
    info: {
      contrastText: white,
      dark: colors.blue[900],
      main: colors.blue[600],
      light: colors.blue[400]
    },
    warning: {
      contrastText: white,
      main: '#E94F37',
      dark: '#E94F37',
      light: '#E94F37'
    },
    error: {
      contrastText: white,
      main: '#E94F37',
      dark: '#E94F37',
      light: '#E94F37'
    },
    text: {
      primary: colors.blueGrey[900],
      secondary: colors.blueGrey[600],
      link: colors.blue[600]
    },
    background: {
      default: '#F6FEDB'
    },
    icon: colors.blueGrey[600],
    divider: colors.grey[200]
  }
});

export default theme;
