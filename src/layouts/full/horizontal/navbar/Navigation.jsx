import { useMediaQuery, Box, Drawer, Container } from "@mui/material";
import NavListing from "./NavListing";
import AuthLogo from "../../shared/logo/AuthLogo";
import SidebarItems from "../../vertical/sidebar/SidebarItems";
import { Profile } from "../../vertical/sidebar/SidebarProfile/Profile";
import { useContext } from "react";
import { CustomizerContext } from "src/context/CustomizerContext";

const Navigation = () => {
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));

  const { activeMode, isLayout, isMobileSidebar, setIsMobileSidebar } = useContext(CustomizerContext);


  if (lgUp) {
    return (
      <Box
        sx={{
          backgroundColor:
            activeMode == "light" ? "white" : "background.default",
          boxShadow: (theme) => theme.shadows[8]
        }}
        py={1}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */}
        {/* ------------------------------------------- */}
        <Container
          sx={{
            maxWidth: isLayout === "boxed" ? "lg" : "100%!important",
          }}
        >
          <NavListing />
        </Container>
      </Box>
    );
  }

  return (
    (<Drawer
      anchor="left"
      open={isMobileSidebar}
      onClose={() => setIsMobileSidebar(false)}
      variant="temporary"
      slotProps={{
        paper: {
          sx: {
            width: '256px',
            border: '0 !important',
            boxShadow: (theme) => theme.shadows[8],
          },
        },
      }}
    >
      {/* ------------------------------------------- */}
      {/* Logo */}
      {/* ------------------------------------------- */}
      <Box px={2}>
        {/* <AuthLogo /> */}
      </Box>
      <Profile />
      {/* ------------------------------------------- */}
      {/* Sidebar For Mobile */}
      {/* ------------------------------------------- */}
      <SidebarItems />
    </Drawer>)
  );
};

export default Navigation;


