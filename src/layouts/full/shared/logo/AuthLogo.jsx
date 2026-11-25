import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material';
import { CustomizerContext } from "src/context/CustomizerContext";

// HOPE brand logo for light surfaces (mobile sidebar drawer, sign-in pages):
// the teal wordmark, or the white one in dark mode.
import HopeWordmark from 'src/assets/images/logos/hope/hope-wordmark.png';
import HopeWordmarkWhite from 'src/assets/images/logos/hope/hope-wordmark-white.png';
import HopeMark from 'src/assets/images/logos/hope/hope-mark.png';
import HopeMarkWhite from 'src/assets/images/logos/hope/hope-mark-white.png';

const LinkStyled = styled(Link, {
  shouldForwardProp: (prop) => prop !== 'isMini',
})(({ isMini }) => ({
  height: '64px',
  width: isMini ? '40px' : '180px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
}));

const AuthLogo = () => {
  const { isCollapse, isSidebarHover, activeMode } = useContext(CustomizerContext);
  const isMini = isCollapse === 'mini-sidebar' && !isSidebarHover;
  const isDark = activeMode === 'dark';

  return (
    <LinkStyled to="/" isMini={isMini} aria-label="HOPE Client Database home">
      {isMini ? (
        <img src={isDark ? HopeMarkWhite : HopeMark} alt="HOPE" style={{ width: '36px', height: '36px' }} />
      ) : (
        <img src={isDark ? HopeWordmarkWhite : HopeWordmark} alt="HOPE" style={{ height: '36px', width: 'auto' }} />
      )}
    </LinkStyled>
  );
};

export default AuthLogo;
