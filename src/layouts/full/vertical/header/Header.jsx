import { IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack, useTheme } from '@mui/material';
import { IconDots } from '@tabler/icons-react';
import Notifications from './Notification';
import Profile from './Profile';
import Cart from './Cart';
import Search from './Search';
import Language from './Language';
import MobileRightSidebar from './MobileRightSidebar';
import Logo from '../../shared/logo/Logo';
import AppDD from './Navigation';
import Messages from './Messages';
import DarkLightMode from './DarkLightMode';
import { useEffect, useState, useContext } from 'react';
import { Icon } from '@iconify/react';
import { CustomizerContext } from 'src/context/CustomizerContext';

const Header = () => {
  const {
    isSidebarHover,
    isCollapse,
    setIsCollapse,
    setIsSidebarHover,
    isMobileSidebar,
    setIsMobileSidebar,
  } = useContext(CustomizerContext);

  const [height, setHeight] = useState('0px');

  // ✅ BULLETPROOF FIX: Use window.innerWidth as fallback
  const [lgUp, setLgUp] = useState(window.innerWidth >= 1200);
  const [lgDown, setLgDown] = useState(window.innerWidth < 1200);

  // ✅ Try to get theme, but don't crash if it fails
  let theme;
  try {
    theme = useTheme();
  } catch (error) {
    console.warn('⚠️ Header: useTheme failed, using fallback');
    theme = null;
  }

  // ✅ Update breakpoints based on theme if available, otherwise use window size
  useEffect(() => {
    if (theme) {
      try {
        const updateBreakpoints = () => {
          setLgUp(window.innerWidth >= 1200);
          setLgDown(window.innerWidth < 1200);
        };
        
        updateBreakpoints();
        window.addEventListener('resize', updateBreakpoints);
        return () => window.removeEventListener('resize', updateBreakpoints);
      } catch (error) {
        console.warn('⚠️ Header: Breakpoint setup failed');
      }
    }
  }, [theme]);

  const handleChange = () => {
    height == '0px' ? setHeight('auto') : setHeight('0px');
  };

  const toggleWidth = isCollapse == 'mini-sidebar' && !isSidebarHover ? '75px' : '256px';

  // ✅ Safe styled components with fallback
  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none !important',
    background: theme?.palette?.primary?.main || '#1976d2',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    minHeight: '64px',
  }));
  
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme?.palette?.warning?.contrastText || '#fff',
    gap: '8px',
    padding: '0 20px',
  }));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setHeight('0px');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <AppBarStyled position="sticky" color="default">
        <ToolbarStyled>
          {/* ------------------------------------------- */}
          {/* Logo */}
          {/* ------------------------------------------- */}

          {lgUp ? (
            <>
              <Box
                sx={{
                  width: toggleWidth,
                }}
              >
                <Logo />
              </Box>
            </>
          ) : (
            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={
                lgUp
                  ? () => setIsSidebarHover(!isSidebarHover)
                  : () => setIsMobileSidebar(!isMobileSidebar)
              }
            >
              <Icon icon="solar:list-bold" height={20} />
            </IconButton>
          )}
          {/* ------------------------------------------- */}
          {/* Toggle Button Sidebar */}
          {/* ------------------------------------------- */}

          {lgUp ? (
            <>
              <IconButton
                color="inherit"
                aria-label="menu"
                onClick={() => {
                  lgUp
                    ? // When lgUp is true, toggle sidebar between full-sidebar and mini-sidebar
                    isCollapse === 'full-sidebar'
                      ? setIsCollapse('mini-sidebar')
                      : setIsCollapse('full-sidebar')
                    : // When lgUp is false (mobile view), toggle sidebar similarly
                    isCollapse === 'full-sidebar'
                      ? setIsCollapse('mini-sidebar')
                      : setIsCollapse('full-sidebar');
                }}
              >
                <Icon icon="solar:list-bold" height={20} />
              </IconButton>
            </>
          ) : null}

          {/* ------------------------------------------- */}
          {/* Search Dropdown */}
          {/* ------------------------------------------- */}
          {lgUp ? (
            <>
              {/* <Search /> */}
            </>
          ) : null}

          {lgUp ? (
            <>
              {/* <AppDD /> */}
            </>
          ) : null}

          <Box flexGrow={1} />

          {lgUp ? (
            <>
              <Stack spacing={2} direction="row" alignItems="center">
                {/* <Language /> */}
                {/* ------------------------------------------- */}
                {/* DarkLightMode */}
                {/* ------------------------------------------- */}
                {/* <DarkLightMode /> */}
                {/* ------------------------------------------- */}
                {/* Ecommerce Dropdown */}
                {/* ------------------------------------------- */}
                {/* <Cart /> */}
                {/* ------------------------------------------- */}
                {/* Notification Dropdown */}
                {/* ------------------------------------------- */}
                {/* <Notifications /> */}
                {/* ------------------------------------------- */}
                {/* Messages Dropdown */}
                {/* ------------------------------------------- */}
                {/* <Messages /> */}

                {/* ------------------------------------------- */}
                {/* Toggle Right Sidebar for mobile */}
                {/* ------------------------------------------- */}
                {lgDown ? <MobileRightSidebar /> : null}
                <Profile />
              </Stack>
            </>
          ) : (
            <Box
              display="flex"
              justifyContent="center"
              sx={{
                width: toggleWidth,
              }}
            >
              <Logo />
            </Box>
          )}
          {lgUp ? null : (
            <>
              <Box flexGrow={1} />
            </>
          )}
          {lgUp ? null : (
            <>
              <IconButton
                onClick={handleChange}
                aria-label="show 4 new mails"
                color="inherit"
                size="large"
              >
                <IconDots size="22" />
              </IconButton>
            </>
          )}
        </ToolbarStyled>
        <Box
          sx={{
            maxHeight: { height },
            width: '100%',
            backgroundColor: 'transparent',
            transition: 'all 2s ease',
            overflow: 'hidden',
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            paddingX={3}
          >
            <Stack spacing={2} direction="row" alignItems="center">
              {/* ------------------------------------------- */}
              {/* Notification Dropdown */}
              {/* ------------------------------------------- */}
              <Notifications />
              {/* ------------------------------------------- */}
              {/* Messages Dropdown */}
              {/* ------------------------------------------- */}
              <Messages />

              {/* ------------------------------------------- */}
              {/* Toggle Right Sidebar for mobile */}
              {/* ------------------------------------------- */}
              {lgDown ? <MobileRightSidebar /> : null}
            </Stack>
            <Stack spacing={2} direction="row" alignItems="center">
              {/* ------------------------------------------- */}
              {/* Language */}
              {/* ------------------------------------------- */}
              <Language />
              {/* ------------------------------------------- */}
              {/* DarkLightMode */}
              {/* ------------------------------------------- */}
              <DarkLightMode />
              {/* ------------------------------------------- */}
              {/* Profile */}
              {/* ------------------------------------------- */}
              <Profile />
              {/* <Welcome /> */}
            </Stack>
          </Stack>
        </Box>
      </AppBarStyled>
    </>
  );
};

export default Header;