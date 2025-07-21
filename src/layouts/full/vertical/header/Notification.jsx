import { useState } from 'react';
import { IconButton, Box, Badge, MenuItem, Typography, Button, Divider } from '@mui/material';
import Menu from '@mui/material/Menu';
import * as dropdownData from './data';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { styled } from '@mui/material/styles';
import { Stack } from '@mui/system';
import { Link } from 'react-router';
import { IconChevronRight } from '@tabler/icons-react';
import { Icon } from '@iconify/react';

const Notifications = () => {
  const [anchorEl2, setAnchorEl2] = useState(null);

  const handleClick2 = (event) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const StyledMenu = styled((props) => (
    <Menu
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      {...props}
    />
  ))(({ theme }) => ({
    '& .MuiPaper-root': {
      '& .MuiMenuItem-root': {
        '&:hover': {
          backgroundColor:
            theme.palette.mode === 'light'
              ? `${theme.palette.action.hover}`
              : `${theme.palette.background.default}`,
        },
      },
    },
  }));

  return (
    <Box color="white">
      <IconButton aria-label="show 4 new mails" color="inherit" onClick={handleClick2} size="large">
        <Box component="span" className="heartbit"></Box>
        <Badge color="error" variant="dot">
          <Icon icon="solar:bell-bing-line-duotone" height={20} />
        </Badge>
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <StyledMenu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        sx={{
          '& .MuiMenu-paper': {
            width: '360px',
            maxHeight: 'none',
            background: 'transparent',

            '& .MuiMenu-list': {
              paddingY: 0,
            },
          },
        }}
      >
        <Stack
          direction="column"
          py={2}
          px={3}
          justifyContent="start"
          color="#fff"
          alignItems="start"
          bgcolor={'primary.main'}
        >
          <Typography variant="h5" fontSize="20px">
            Notifications
          </Typography>
          <Typography variant="h6" fontSize="12px">
            You have 4 Notifications
          </Typography>
        </Stack>
        <Scrollbar sx={{ height: '350px' }}>
          {dropdownData.notifications.map((notification, index) => {
            // const Icon = notification.icon;
            const bgvalue = notification.bgcolor;
            const colorvalue = notification.color;
            return (
              <Box key={index}>
                <MenuItem
                  sx={{
                    p: 2,
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark' ? theme.palette.background.paper : 'white',
                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Stack direction="row" spacing={2}>
                    <Box
                      minWidth="40px"
                      height="40px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      bgcolor={`${bgvalue}`}
                      color={`${colorvalue}`}
                      borderRadius="50px"
                    >
                      <Icon icon={notification.icon} height={20} />
                    </Box>
                    <Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography
                          variant="subtitle2"
                          color="textPrimary"
                          fontWeight={500}
                          fontSize="14px"
                          width="fit-content"
                          noWrap
                          sx={{
                            width: '200px',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Typography
                          color="textSecondary"
                          variant="subtitle2"
                          fontSize="12px"
                          lineHeight={1.25}
                          noWrap
                        >
                          {notification.time}
                        </Typography>
                      </Box>
                      <Typography
                        color="textSecondary"
                        variant="subtitle2"
                        fontSize="12px"
                        lineHeight={1.25}
                        sx={{
                          width: '200px',
                        }}
                      >
                        {notification.subtitle}
                      </Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              </Box>
            );
          })}
        </Scrollbar>
        <Divider />
        <Box p={2} sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? theme.palette.background.default : 'white',
          borderRadius: "0px"
        }}>
          <Button
            to="/apps/email"
            variant="contained"
            component={Link}
            color="primary"
            sx={{
              display: 'flex',
              gap: '6px',
              lineHeight: 2,
            }}
            fullWidth
          >
            Check all Notifications <IconChevronRight width={18} />
          </Button>
        </Box>
      </StyledMenu>
    </Box>
  );
};

export default Notifications;
