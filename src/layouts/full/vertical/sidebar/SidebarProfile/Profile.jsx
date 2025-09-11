// Updated Profile component for your existing auth setup
import { Box, Avatar, Typography, Tooltip, IconButton, Skeleton, Menu, MenuItem, Button } from '@mui/material';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';
import { IconCaretDownFilled } from '@tabler/icons-react';
import { useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import ProfileImg from 'src/assets/images/profile/user-1.jpg';
import SidebarProfileBgImg from 'src/assets/images/backgrounds/sidebar-profile-bg.jpg';
import { CustomizerContext } from "src/context/CustomizerContext";
import { useAzureProfile } from '../../../../../backend/services/azureProfileService'; // Adjust path as needed

const StyledMenu = styled((props) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'center',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'center',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 200,
    color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    boxShadow:
      'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenuItem-root': {
      gap: '6px',
      alignItems: 'center',
      padding: '8px 16px',
      '&:hover': {
        backgroundColor:
          theme.palette.mode === 'light'
            ? `${theme.palette.action.hover}`
            : `${theme.palette.background.default}`,
      },
    },
  },
}));

export const Profile = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  
  // ✅ Get auth data from your existing Redux store
  const authUser = useSelector(state => state.auth.user);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const userRoles = useSelector(state => state.auth.userRoles);
  const authLoading = useSelector(state => state.auth.loading);
  
  // ✅ Get Azure profile data
  const { 
    profile, 
    photo, 
    loading: profileLoading, 
    error: profileError,
    getDisplayName,
    getJobTitle,
    getOfficeLocation,
    getInitials
  } = useAzureProfile();

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

  // ✅ Determine what to display based on available data
  const displayData = {
    name: getDisplayName(),
    jobTitle: getJobTitle(),
    officeLocation: getOfficeLocation(),
    photo: photo || ProfileImg,
    initials: getInitials(),
    email: profile?.mail || authUser?.email || 'N/A',
    roles: userRoles || []
  };

  // ✅ Helper function to truncate text
  const truncateText = (text, maxLength = 20) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // ✅ Check if we're loading
  const isLoading = authLoading || profileLoading;

  return (
    <Box
      sx={{
        backgroundImage: `url(${SidebarProfileBgImg})`,
        borderRadius: '0 !important',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
      }}
    >
      {/* Avatar Section */}
      <Box
        py="28px"
        borderRadius="0 !important"
        sx={{
          px: isCollapse == 'mini-sidebar' ? '14px' : '30px',
        }}
      >
        <Box className="profile-img" position="relative">
          {isLoading ? (
            <Skeleton variant="circular" width={50} height={50} />
          ) : (
            <Avatar 
              alt={displayData.name} 
              src={displayData.photo} 
              sx={{ height: 50, width: 50 }}
            >
              {displayData.initials}
            </Avatar>
          )}
        </Box>
      </Box>
      
      {/* User Info Section */}
      <IconButton
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        size="small"
        aria-label="user profile"
        sx={{ p: 0, width: '100%' }}
      >
        {isCollapse == 'mini-sidebar' && !isSidebarHover ? null : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              py: '8px',
              px: 2,
              bgcolor: 'rgba(0,0,0,0.6)',
              borderRadius: '0 !important',
              width: '100%',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {isLoading ? (
                // ✅ Loading skeletons
                <Box>
                  <Skeleton 
                    variant="text" 
                    width="80%" 
                    height={20} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} 
                  />
                  <Skeleton 
                    variant="text" 
                    width="60%" 
                    height={16} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} 
                  />
                </Box>
              ) : !isAuthenticated ? (
                // ✅ Not authenticated fallback
                <Typography
                  variant="h6"
                  fontSize="15px"
                  color="white"
                  fontWeight="400"
                >
                  Please log in
                </Typography>
              ) : (
                // ✅ Display user information
                <>
                  {/* Display Name */}
                  <Typography
                    variant="h6"
                    fontSize="15px"
                    color="white"
                    fontWeight="500"
                    sx={{
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      lineHeight: 1.2,
                    }}
                  >
                    {truncateText(displayData.name, 18)}
                  </Typography>
                  
                  {/* Job Title */}
                  {displayData.jobTitle && (
                    <Typography
                      variant="caption"
                      fontSize="12px"
                      color="rgba(255,255,255,0.8)"
                      sx={{
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        display: 'block',
                        lineHeight: 1,
                      }}
                    >
                      {truncateText(displayData.jobTitle, 16)}
                    </Typography>
                  )}
                  
                  {/* Office Location */}
                  {displayData.officeLocation && (
                    <Typography
                      variant="caption"
                      fontSize="11px"
                      color="rgba(255,255,255,0.7)"
                      sx={{
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        display: 'block',
                        lineHeight: 1,
                        mt: 0.25,
                      }}
                    >
                      📍 {truncateText(displayData.officeLocation, 14)}
                    </Typography>
                  )}
                </>
              )}
            </Box>
            
            {/* Dropdown Arrow */}
            <Box>
              <Tooltip title="User Menu" placement="top">
                <Box color="white" sx={{ p: 0 }}>
                  <IconCaretDownFilled width={18} />
                </Box>
              </Tooltip>
            </Box>
          </Box>
        )}
      </IconButton>

      {/* ✅ Enhanced Menu with Azure Profile Data */}
      <StyledMenu
        id="profile-menu"
        MenuListProps={{
          'aria-labelledby': 'profile-button',
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {/* User Info Header */}
        {isAuthenticated && (
          <>
            <Box px={2} py={1} borderBottom="1px solid rgba(0,0,0,0.1)">
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar 
                  src={displayData.photo} 
                  alt={displayData.name} 
                  sx={{ width: 32, height: 32 }}
                >
                  {displayData.initials}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography fontSize="14px" fontWeight="600" noWrap>
                    {displayData.name}
                  </Typography>
                  {displayData.email && (
                    <Typography fontSize="12px" color="text.secondary" noWrap>
                      {displayData.email}
                    </Typography>
                  )}
                  {displayData.jobTitle && (
                    <Typography fontSize="11px" color="text.secondary" noWrap>
                      {displayData.jobTitle}
                    </Typography>
                  )}
                  {displayData.officeLocation && (
                    <Typography fontSize="11px" color="text.secondary" noWrap>
                      📍 {displayData.officeLocation}
                    </Typography>
                  )}
                  {/* Show roles if available */}
                  {displayData.roles.length > 0 && (
                    <Typography fontSize="10px" color="primary.main" noWrap>
                      Roles: {displayData.roles.join(', ')}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            <MenuItem onClick={handleClose} disableRipple>
              <Box color="primary.main" display="flex" alignItems="center">
                <Icon icon="solar:user-circle-line-duotone" height={22} />
              </Box>
              <Typography fontSize="15px" ml={1}>
                My Profile
              </Typography>
            </MenuItem>
            
            <MenuItem onClick={handleClose} disableRipple>
              <Box color="secondary.main" display="flex" alignItems="center">
                <Icon icon="solar:notes-line-duotone" height={21} />
              </Box>
              <Typography fontSize="15px" ml={1}>
                My Notes
              </Typography>
            </MenuItem>
            
            <MenuItem onClick={handleClose} disableRipple>
              <Box color="success.main" display="flex" alignItems="center">
                <Icon icon="solar:inbox-line-line-duotone" height={21} />
              </Box>
              <Typography fontSize="15px" ml={1}>
                Inbox
              </Typography>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleClose} disableRipple>
              <Box color="warning.main" display="flex" alignItems="center">
                <Icon icon="solar:settings-line-duotone" height={21} />
              </Box>
              <Typography fontSize="15px" ml={1}>
                Account Setting
              </Typography>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleClose} disableRipple>
              <Box color="error.main" display="flex" alignItems="center">
                <Icon icon="solar:logout-2-line-duotone" height={21} />
              </Box>
              <Link to="/auth/auth1/login">
                <Typography fontSize="15px" ml={1} color="textPrimary">
                  Logout
                </Typography>
              </Link>
            </MenuItem>
            
            <Divider />
            
            <Box px="12px" pb={1}>
              <Button variant="contained" color="primary" fullWidth>
                View Profile
              </Button>
            </Box>
          </>
        )}
      </StyledMenu>

      {/* ✅ Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ p: 1, fontSize: '10px', color: 'white', opacity: 0.7 }}>
          <div>Auth: {isAuthenticated ? '✅' : '❌'}</div>
          <div>Profile: {profile ? '✅' : '❌'}</div>
          <div>Photo: {photo ? '✅' : '❌'}</div>
          {profileError && <div style={{ color: '#ffcccc' }}>Error: {profileError}</div>}
          {profile && (
            <>
              <div>Job: {profile.jobTitle || 'N/A'}</div>
              <div>Office: {profile.officeLocation || 'N/A'}</div>
              <div>Dept: {profile.department || 'N/A'}</div>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};