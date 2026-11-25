// Brand theme per deployment: VITE_BRAND=teal (HOPE / Serenity, the default) or
// VITE_BRAND=blue (the original template blue).
const BRAND_THEMES = { teal: 'HOPE_TEAL_THEME', blue: 'BLUE_THEME' };
const brand = (import.meta.env.VITE_BRAND || 'teal').toLowerCase();

const config = {
    activeDir: 'ltr', // This can be ltr or rtl
    activeMode: 'light', // This can be light or dark
    activeTheme: BRAND_THEMES[brand] || 'HOPE_TEAL_THEME', // HOPE_TEAL_THEME, BLUE_THEME, GREEN_THEME, AQUA_THEME, PURPLE_THEME, CYAN_THEME, ORANGE_THEME
    activeLayout: 'vertical', // This can be vertical or horizontal
    isLayout: 'boxed', // This can be full or boxed
    isSidebarHover: false,
    isCollapse: 'full-sidebar',
    isLanguage: 'en',
    isCardShadow: true,
    isMobileSidebar: false,
    isHorizontal: false,
    isBorderRadius: 10,
    sidebarWidth: 256,
    miniSidebarWidth: 75,
    topbarHeight: 64,
};

export default config;
