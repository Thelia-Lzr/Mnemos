import { alpha, createTheme } from '@mui/material/styles';
import type { PaletteMode, ThemeOptions } from '@mui/material';

export const brand = {
  blue: '#3037ef',
  violet: '#6b37e5',
  lilac: '#d9ccff',
  ink: '#16152b',
  paper: '#f8f7ff',
};

function makeTheme(mode: PaletteMode) {
  const dark = mode === 'dark';
  const primary = dark ? '#a7aaff' : brand.blue;
  const secondary = dark ? '#c6a8ff' : brand.violet;
  const divider = dark ? '#383553' : '#dfdcef';
  const background = dark ? '#141326' : brand.paper;
  const paper = dark ? '#201e35' : '#ffffff';

  const components: ThemeOptions['components'] = {
    MuiCssBaseline: {
      styleOverrides: {
        ':focus-visible': { outline: `2px solid ${primary}`, outlineOffset: 3 },
        '::selection': { background: brand.lilac, color: brand.ink },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 40, paddingInline: 16 },
        sizeSmall: { minHeight: 32, paddingInline: 10 },
        outlined: { borderColor: primary },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: `1px solid ${divider}`, boxShadow: 'none' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: dark ? '#676281' : '#a09ab9' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${divider}` },
        indicator: { height: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700, minHeight: 44 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 2, fontWeight: 650 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { backgroundColor: alpha(primary, 0.12) },
          '&.Mui-selected:hover': { backgroundColor: alpha(primary, 0.18) },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 5 } },
    },
  };

  return createTheme({
    palette: {
      mode,
      primary: { main: primary, contrastText: dark ? brand.ink : '#ffffff' },
      secondary: { main: secondary, contrastText: dark ? brand.ink : '#ffffff' },
      info: { main: dark ? '#8fc1ff' : '#245ebe' },
      success: { main: dark ? '#70d9ae' : '#12704e' },
      warning: { main: dark ? '#ffc180' : '#9b4d12' },
      error: { main: dark ? '#ff99ad' : '#bd2453' },
      background: { default: background, paper },
      text: {
        primary: dark ? '#f3efff' : brand.ink,
        secondary: dark ? '#c0b9d5' : '#59546d',
      },
      divider,
    },
    typography: {
      fontFamily: '"Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.055em', lineHeight: 1.03 },
      h2: { fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.08 },
      h3: { fontWeight: 800, letterSpacing: '-0.04em' },
      h4: { fontWeight: 780, letterSpacing: '-0.035em' },
      h5: { fontWeight: 740, letterSpacing: '-0.025em' },
      h6: { fontWeight: 720, letterSpacing: '-0.02em' },
      body1: { lineHeight: 1.55 },
      body2: { lineHeight: 1.55 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: 2 },
    components,
  });
}

export const lightTheme = makeTheme('light');
export const darkTheme = makeTheme('dark');
