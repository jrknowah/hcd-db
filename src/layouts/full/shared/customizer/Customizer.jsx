import { useState, useContext } from 'react';
import {
  Fab,
  Drawer,
  Grid,
  Slider,
  Divider,
  styled,
  IconButton,
  Typography,
  Tooltip,
  Stack,
  Snackbar,
} from '@mui/material';
import Box from '@mui/material/Box';
import { IconX, IconSettings, IconCheck } from '@tabler/icons-react';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { Icon } from '@iconify/react';
import { CustomizerContext } from 'src/context/CustomizerContext'

const SidebarWidth = '320px';

const Customizer = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const StyledBox = styled(Box)(({ theme }) => ({
    boxShadow: theme.shadows[8],
    padding: '20px',
    cursor: 'pointer',
    justifyContent: 'center',
    display: 'flex',
    transition: '0.1s ease-in',
    border: '1px solid rgba(145, 158, 171, 0.12)',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  }));

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const handleSnackbarClose = () => setOpenSnackbar(false);


  const {
    activeDir,
    setActiveDir,
    activeMode,
    setActiveMode,
    isCollapse,
    setIsCollapse,
    activeTheme,
    activeLayout,
    setActiveLayout,
    isLayout,
    isCardShadow,
    setIsCardShadow,
    setIsLayout,
    isBorderRadius,
    setIsBorderRadius,
    setActiveTheme
  } = useContext(CustomizerContext);


  const thColors = [
    {
      id: 1,
      bgColor: '#1B84FF',
      disp: 'BLUE_THEME',
    },
    {
      id: 2,
      bgColor: '#0074BA',
      disp: 'AQUA_THEME',
    },
    {
      id: 3,
      bgColor: '#763EBD',
      disp: 'PURPLE_THEME',
    },
    {
      id: 4,
      bgColor: '#0A7EA4',
      disp: 'GREEN_THEME',
    },
    {
      id: 5,
      bgColor: '#01C0C8',
      disp: 'CYAN_THEME',
    },
    {
      id: 6,
      bgColor: '#FA896B',
      disp: 'ORANGE_THEME',
    },
  ];

  const addAttributeToBody = (cvalue) => {
    document.body.setAttribute("data-color-theme", cvalue);
  };


  return (
    (<div>
      {/* ------------------------------------------- */}
      {/* --Floating Button to open customizer ------ */}
      {/* ------------------------------------------- */}
      <Tooltip title="Settings">
        <Fab
          color="primary"
          aria-label="settings"
          sx={{ position: 'fixed', right: '25px', bottom: '15px' }}
          onClick={() => setShowDrawer(true)}
        >
          <IconSettings stroke={1.5} />
        </Fab>
      </Tooltip>
      <Drawer
        anchor="right"
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        slotProps={{
          paper: {
            sx: {
              width: SidebarWidth,
            },
          }
        }}
      >
        {/* ------------------------------------------- */}
        {/* ------------ Customizer Sidebar ------------- */}
        {/* ------------------------------------------- */}
        <Scrollbar sx={{ height: 'calc(100vh - 5px)' }}>
          <Box p={2} display="flex" justifyContent={'space-between'} alignItems="center">
            <Typography variant="h4">Settings</Typography>

            <IconButton color="inherit" onClick={() => setShowDrawer(false)}>
              <IconX size="1rem" />
            </IconButton>
          </Box>
          <Divider />
          <Box p={3}>
            {/* ------------------------------------------- */}
            {/* ------------ Dark light theme setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Option
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox
                onClick={() => setActiveMode("light")}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color:
                        activeMode === 'light'
                          ? (theme) => theme.palette.primary.main
                          : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:sun-2-line-duotone" height={20} />
                </Box>
                Light
              </StyledBox>
              <StyledBox
                onClick={() => setActiveMode("dark")}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color:
                        activeMode === 'dark'
                          ? (theme) => theme.palette.primary.main
                          : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:moon-line-duotone" height={20} />
                </Box>
                Dark
              </StyledBox>
            </Stack>

            <Box pt={3} />
            {/* ------------------------------------------- */}
            {/* ------------ RTL theme setting -------------*/}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Direction
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox
                onClick={() => setActiveDir("ltr")}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color:
                        activeDir === 'ltr'
                          ? (theme) => theme.palette.primary.main
                          : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:align-left-line-duotone" height={20} />
                </Box>
                LTR
              </StyledBox>
              <StyledBox
                onClick={() => setActiveDir("rtl")}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color:
                        activeDir === 'rtl'
                          ? (theme) => theme.palette.primary.main
                          : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:align-right-line-duotone" height={20} />
                </Box>
                RTL
              </StyledBox>
            </Stack>

            <Box pt={3} />
            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Colors
            </Typography>
            <Grid container spacing={2}>
              {thColors.map((thcolor) => (
                <Grid key={thcolor.id} size={4}>
                  <StyledBox onClick={() => addAttributeToBody(thcolor.disp)}>
                    <Tooltip title={`${thcolor.disp}`} placement="top">
                      <Box
                        sx={{
                          backgroundColor: thcolor.bgColor,
                          width: '25px',
                          height: '25px',
                          borderRadius: '60px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          display: 'flex',
                          color: 'white',
                        }}
                        aria-label={`${thcolor.bgColor}`}
                        onClick={() => setActiveTheme(thcolor.disp)}
                      >
                        {activeTheme === thcolor.disp ? <IconCheck width={13} /> : ''}
                      </Box>
                    </Tooltip>
                  </StyledBox>
                </Grid>
              ))}
            </Grid>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Layout Horizontal / Vertical ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Layout Type
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox
                onClick={() => setActiveLayout("vertical")}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color:
                        activeLayout === 'vertical'
                          ? (theme) => theme.palette.primary.main
                          : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:align-horizonta-spacing-line-duotone" height={20} />
                </Box>
                Vertical
              </StyledBox>

              <div
                onClick={() => {
                  if (isCollapse == "mini-sidebar") {
                    setSnackbarMessage('Please Select Sidebar Type Full ');
                    setOpenSnackbar(true);
                  } else {
                    setActiveLayout("horizontal");
                  }
                }}
              >
                <StyledBox
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{
                    opacity: isCollapse === "mini-sidebar" ? 0.5 : 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      '& svg': {
                        color:
                          activeLayout === "horizontal"
                            ? (theme) => theme.palette.primary.main
                            : 'inherit',
                      },
                    }}
                  >
                    <Icon icon="solar:align-vertical-spacing-line-duotone" height={20} />
                  </Box>
                  Horizontal
                </StyledBox>
                <Snackbar
                  open={openSnackbar}
                  autoHideDuration={3000}
                  onClose={handleSnackbarClose}
                  message={snackbarMessage}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                  }}
                >
                </Snackbar>
              </div>
            </Stack>

            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Layout Boxed / Full ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Container Option
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox
                onClick={() => setIsLayout("boxed")}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color:
                        isLayout === 'boxed'
                          ? (theme) => theme.palette.primary.main
                          : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:cardholder-linear" height={20} />
                </Box>
                Boxed
              </StyledBox>
              <StyledBox
                onClick={() => setIsLayout("full")}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color:
                        isLayout === 'full'
                          ? (theme) => theme.palette.primary.main
                          : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:scanner-linear" height={20} />
                </Box>
                Full
              </StyledBox>
            </Stack>

            {/* ------------------------------------------- */}
            {/* ------------ Sidebar Color setting ------------- */}
            {/* ------------------------------------------- */}

            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            {activeLayout === "horizontal" ? (
              ''
            ) : (
              <>
                <Box pt={4} />
                <Typography variant="h6" gutterBottom>
                  Sidebar Type
                </Typography>
                <Stack direction={'row'} gap={2} my={2}>
                  <StyledBox onClick={() => setIsCollapse('full-sidebar')} display="flex" gap={1}>
                    <Box
                      sx={{
                        display: 'flex',
                        '& svg': {
                          color: isCollapse === "full-sidebar"
                            ? (theme) => theme.palette.primary.main
                            : 'inherit',
                        },
                      }}
                    >
                      <Icon icon="solar:sidebar-minimalistic-outline" height={20} />
                    </Box>
                    Full
                  </StyledBox>
                  <StyledBox onClick={() => setIsCollapse("mini-sidebar")} display="flex" gap={1}>
                    <Box
                      sx={{
                        display: 'flex',
                        '& svg': {
                          color: isCollapse === "mini-sidebar"
                            ? (theme) => theme.palette.primary.main
                            : 'inherit',
                        },
                      }}
                    >
                      <Icon icon="solar:siderbar-outline" height={20} />
                    </Box>
                    Collpase
                  </StyledBox>
                </Stack>
              </>
            )}
            <Box pt={4} />
            <Typography variant="h6" gutterBottom>
              Card With
            </Typography>
            <Stack direction={'row'} gap={2} my={2}>
              <StyledBox onClick={() => setIsCardShadow(false)} display="flex" gap={1}>
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color: isCardShadow
                        ? (theme) => theme.palette.primary.main
                        : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:full-screen-outline" height={20} />
                </Box>
                Border
              </StyledBox>
              <StyledBox onClick={() => setIsCardShadow(true)} display="flex" gap={1}>
                <Box
                  sx={{
                    display: 'flex',
                    '& svg': {
                      color: isCardShadow
                        ? (theme) => theme.palette.primary.main
                        : 'inherit',
                    },
                  }}
                >
                  <Icon icon="solar:full-screen-square-line-duotone" height={20} />
                </Box>
                Shadow
              </StyledBox>
            </Stack>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Border Radius
            </Typography>

            <Slider
              size="small"
              value={isBorderRadius}
              aria-label="Small"
              min={4}
              max={24}
              onChange={(event) => setIsBorderRadius(event.target.value)}
              valueLabelDisplay="auto"
            />
          </Box>
        </Scrollbar>
      </Drawer>
    </div>)
  );
};

export default Customizer;
