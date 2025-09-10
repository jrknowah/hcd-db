import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material';
import { CustomizerContext } from "src/context/CustomizerContext";

// Option 1: If you save the HOPE logo as an SVG file and import it
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ReactComponent as HopeLogo } from 'src/assets/images/logos/hope-logo.svg';

// Option 2: Inline HOPE Logo Component - Optimized for header
const HopeLogoInline = ({ width = "220", height = "60" }) => (
  <svg width={width} height={height} viewBox="0 0 220 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    
    {/* Medical cross with data elements */}
    <g transform="translate(15, 15)">
      {/* Medical cross */}
      <rect x="8" y="5" width="4" height="20" fill="url(#iconGradient)" rx="1"/>
      <rect x="3" y="10" width="14" height="4" fill="url(#iconGradient)" rx="1"/>
      
      {/* Data/file elements around the cross */}
      <rect x="22" y="7" width="8" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="10" width="6" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="13" width="7" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="16" width="9" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="19" width="5" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      
      {/* Heart element for hope */}
      <path d="M 10 28 C 8 26, 4 26, 4 30 C 4 34, 10 40, 10 40 C 10 40, 16 34, 16 30 C 16 26, 12 26, 10 28 Z" 
            fill="url(#iconGradient)" opacity="0.7"/>
    </g>
    
    {/* Main text */}
    <text x="70" y="35" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" fill="white">
      HOPE
    </text>
    
    {/* Subtitle */}
    <text x="70" y="48" fontFamily="Arial, sans-serif" fontSize="10" fill="white" opacity="0.8">
      Client Database
    </text>
    
    {/* Connecting lines for data flow concept */}
    <g stroke="white" strokeWidth="1" opacity="0.3" fill="none">
      <line x1="55" y1="25" x2="65" y2="25"/>
      <line x1="55" y1="30" x2="65" y2="30"/>
      <line x1="55" y1="35" x2="65" y2="35"/>
      <circle cx="52" cy="25" r="1" fill="white"/>
      <circle cx="52" cy="30" r="1" fill="white"/>
      <circle cx="52" cy="35" r="1" fill="white"/>
    </g>
  </svg>
);

const Logo = () => {
  const { isCollapse, isSidebarHover, activeDir, activeMode } = useContext(CustomizerContext);

  const LinkStyled = styled(Link)(() => ({
    height: '64px',
    width: isCollapse === 'mini-sidebar' && !isSidebarHover ? '60px' : '220px',
    overflow: 'hidden',
    display: 'block',
  }));

  // Determine logo size based on sidebar state
  const logoWidth = isCollapse === 'mini-sidebar' && !isSidebarHover ? "60" : "220";
  const logoHeight = "60";

  return (
    <LinkStyled
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Option 1: Use imported SVG component */}
      {/* <HopeLogo style={{ width: logoWidth, height: logoHeight }} /> */}
      
      {/* Option 2: Use inline component */}
      <HopeLogoInline width={logoWidth} height={logoHeight} />
    </LinkStyled>
  );
};

export default Logo;