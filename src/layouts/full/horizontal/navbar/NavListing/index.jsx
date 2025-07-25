import { useContext } from 'react';
import Menudata from '../Menudata';
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery } from '@mui/material';
import NavItem from '../NavItem';
import NavCollapse from '../NavCollapse';
import { CustomizerContext } from 'src/context/CustomizerContext';


const NavListing = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);

  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));

  const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? isCollapse == "mini-sidebar" && !isSidebarHover : '';

  return (
    <Box>
      <List sx={{ p: 0, display: 'flex', gap: '3px', zIndex: '100' }}>
        {Menudata.map((item) => {
          if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id} onClick={undefined} />
            );

            // {/********If Sub No Menu**********/}
          } else {
            return (
              <NavItem item={item} key={item.id} pathDirect={pathDirect} hideMenu={hideMenu} onClick={function () {
                throw new Error('Function not implemented.');
              }} />
            );
          }
        })}
      </List>
    </Box>
  );
};
export default NavListing;


