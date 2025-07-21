import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack
} from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';
import Notifications from '../../vertical/header/Notification';
import Cart from '../../vertical/header/Cart';
import Profile from '../../vertical/header/Profile';
import Search from '../../vertical/header/Search';
import Language from '../../vertical/header/Language';
import Logo from '../../shared/logo/Logo';
import DarkLightMode from '../../vertical/header/DarkLightMode';
import Messages from '../../vertical/header/Messages';
import AppDD from '../../vertical/header/Navigation';
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';

const Header = () => {
  const { isLayout, setIsMobileSidebar, isMobileSidebar } = useContext(CustomizerContext);

  const lgDown = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.primary.main,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',

    [theme.breakpoints.up('lg')]: {
      minHeight: '64px',
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.warning.contrastText,
    margin: '0 auto',
    gap: 2,
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled
        sx={{
          maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
        }}
      >
        <Box sx={{ width: lgDown ? '40px' : 'auto', overflow: 'hidden' }}>
          <Logo />
        </Box>
        {/* ------------------------------------------- */}
        {/* Toggle Button Sidebar */}
        {/* ------------------------------------------- */}
        {lgDown ? (
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={() => setIsMobileSidebar(!isMobileSidebar)}
          >
            <IconMenu2 />
          </IconButton>
        ) : (
          ''
        )}
        {/* ------------------------------------------- */}
        {/* Search Dropdown */}
        {/* ------------------------------------------- */}
        <Search />
        {lgUp ? (
          <>
            <AppDD />
          </>
        ) : null}

        <Box flexGrow={1} />
        <Stack spacing={2} direction="row" alignItems="center">
          <Language />
          {/* ------------------------------------------- */}
          {/* DarkLightMode */}
          {/* ------------------------------------------- */}
          <DarkLightMode />
          {/* ------------------------------------------- */}
          {/* Ecommerce Dropdown */}
          {/* ------------------------------------------- */}
          <Cart />
          {/* ------------------------------------------- */}
          {/* End Ecommerce Dropdown */}
          {/* ------------------------------------------- */}
          <Notifications />
          <Messages />
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
