// Brand colors for code that can't read the MUI theme: screens that render
// before the ThemeProvider, and module-level style objects such as the
// react-select styles in the section forms. Follows VITE_BRAND via config.
import { alpha } from '@mui/material/styles';
import config from '../context/config';
import { LightThemeColors } from './LightThemeColors';

export const BRAND_PRIMARY =
  LightThemeColors.find((t) => t.name === config.activeTheme)?.palette.primary.main || '#0F4C5C';

// Pale tints of the brand color for hover, selected and tag backgrounds
export const brandTint = (opacity) => alpha(BRAND_PRIMARY, opacity);
