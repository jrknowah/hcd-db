import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material';
import { CustomizerContext } from "src/context/CustomizerContext";

// HOPE brand logo for the header. The header bar is the primary (teal) color,
// so it uses the white versions: the full wordmark normally, and just the
// sunrise "O" mark when the sidebar is collapsed to its mini width.
import HopeWordmarkWhite from 'src/assets/images/logos/hope/hope-wordmark-white.png';
import HopeMarkWhite from 'src/assets/images/logos/hope/hope-mark-white.png';

const LinkStyled = styled(Link, {
  shouldForwardProp: (prop) => prop !== 'isMini',
})(({ isMini }) => ({
  height: '64px',
  width: isMini ? '60px' : '220px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  textDecoration: 'none',
}));

const Logo = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  const isMini = isCollapse === 'mini-sidebar' && !isSidebarHover;

  return (
    <LinkStyled to="/" isMini={isMini} aria-label="HOPE Client Database home">
      {isMini ? (
        <img src={HopeMarkWhite} alt="HOPE" style={{ width: '40px', height: '40px', marginLeft: '10px' }} />
      ) : (
        <>
          <img src={HopeWordmarkWhite} alt="HOPE" style={{ height: '32px', width: 'auto' }} />
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '12px',
              lineHeight: 1.2,
              borderLeft: '1px solid rgba(255, 255, 255, 0.35)',
              paddingLeft: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            Client<br />Database
          </span>
        </>
      )}
    </LinkStyled>
  );
};

export default Logo;
