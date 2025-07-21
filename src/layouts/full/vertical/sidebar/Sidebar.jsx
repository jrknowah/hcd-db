import { useMediaQuery, Box, Drawer, useTheme } from "@mui/material";
import Scrollbar from "src/components/custom-scroll/Scrollbar";
import { Profile } from "./SidebarProfile/Profile";
import AuthLogo from "../../shared/logo/AuthLogo";
import { CustomizerContext } from "src/context/CustomizerContext";
import { useContext } from "react";
import SidebarItems from "./SidebarItems";

const Sidebar = () => {
  const lgUp = useMediaQuery((theme) => theme.breakpoints.down("lg"));
  const theme = useTheme();

  const {
    isCollapse,
    isSidebarHover,
    setIsSidebarHover,
    isMobileSidebar,
    setIsMobileSidebar,
  } = useContext(CustomizerContext);


  const toggleWidth =
    isCollapse == "mini-sidebar" && !isSidebarHover
      ? '75px'
      : '256px';

  const onHoverEnter = () => {
    if (isCollapse == "mini-sidebar") {
      setIsSidebarHover(true);
    }
  };

  const onHoverLeave = () => {
    setIsSidebarHover(false);
  };


  return (<>
    {!lgUp ? (
      <Box
        sx={{
          zIndex: 100,
          width: toggleWidth,
          flexShrink: 0,
          ...(isCollapse == "mini-sidebar" && {
            position: "absolute",
          }),
        }}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */}
        {/* ------------------------------------------- */}
        <Drawer
          anchor="left"
          open
          onMouseEnter={onHoverEnter}
          onMouseLeave={onHoverLeave}
          variant="permanent"
          slotProps={{
            paper: {
              sx: {
                transition: theme.transitions.create("width", {
                  duration: theme.transitions.duration.shortest,
                }),
                width: toggleWidth,
                boxSizing: "border-box",
                border: "0",
                top: '64px',
                boxShadow: "1px 0 20px #00000014",
              },
            }
          }}
        >
          {/* ------------------------------------------- */}
          {/* Sidebar Box */}
          {/* ------------------------------------------- */}
          <Box
            borderRadius="0 !important"
            sx={{
              height: "100%",
            }}
          >


            <Profile />
            <Scrollbar sx={{ height: "calc(100% - 220px)" }}>

              {/* ------------------------------------------- */}
              {/* Sidebar Items */}
              {/* ------------------------------------------- */}
              <SidebarItems />
            </Scrollbar>
          </Box>
        </Drawer>
      </Box>
    ) : (
      <Drawer
        anchor="left"
        open={isMobileSidebar}
        onClose={() => setIsMobileSidebar(false)}
        variant="temporary"
        slotProps={{
          paper: {
            sx: {
              width: '256px',
              border: "0 !important",
              boxShadow: (theme) => theme.shadows[8],
            },
          }
        }}
      >
        {/* ------------------------------------------- */}
        {/* Logo */}
        {/* ------------------------------------------- */}
        <Box px={2}>
          <AuthLogo />
        </Box>

        <Profile />
        {/* ------------------------------------------- */}
        {/* Sidebar For Mobile */}
        {/* ------------------------------------------- */}
        <SidebarItems />
      </Drawer>
    )}
  </>);
};

export default Sidebar;
