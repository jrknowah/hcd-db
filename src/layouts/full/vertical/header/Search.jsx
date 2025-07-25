import { useState } from 'react';
import {
  IconButton,
  Dialog,
  DialogContent,
  Stack,
  Divider,
  Box,
  List,
  ListItemText,
  Typography,
  TextField,
  ListItemButton,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import Menuitems from '../sidebar/MenuItems';
import { Link } from 'react-router';
import { Icon } from "@iconify/react";



const Search = () => {
  // drawer top
  const [showDrawer2, setShowDrawer2] = useState(false);
  const [search, setSerach] = useState('');

  const handleDrawerClose2 = () => {
    setShowDrawer2(false);
  };

  const filterRoutes = (rotr, cSearch) => {
    if (rotr.length > 1)
      return rotr.filter((t) =>
        t.title ? t.href.toLocaleLowerCase().includes(cSearch.toLocaleLowerCase()) : '',
      );

    return rotr;
  };
  const searchData = filterRoutes(Menuitems, search);

  return (<>
    <IconButton
      aria-label="show 4 new mails"
      color="inherit"
      aria-controls="search-menu"
      aria-haspopup="true"
      onClick={() => setShowDrawer2(true)}
      size="large"
    >
      <Icon icon="solar:magnifer-linear" height={20} />
    </IconButton>
    <Dialog
      open={showDrawer2}
      onClose={() => setShowDrawer2(false)}
      fullWidth
      maxWidth={'sm'}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"

      slotProps={{
        paper: {
          position: 'fixed', top: 30, m: 0
        },
      }}
    >
      <DialogContent className="testdialog">
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            id="tb-search"
            placeholder="Search here"
            fullWidth
            onChange={(e) => setSerach(e.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Search here' }
            }}
          />
          <IconButton size="small" onClick={handleDrawerClose2}>
            <IconX size="18" />
          </IconButton>
        </Stack>
      </DialogContent>
      <Divider />
      <Box p={2} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
        <Typography variant="h5" p={1}>
          Quick Page Links
        </Typography>
        <Box>
          <List component="nav">
            {searchData.map((menu) => {
              return (
                <Box sx={{
                  overflow: 'hidden',
                  border: '1px solid transparent',
                  '&:hover': {
                    border: '1px dashed',
                    borderColor: 'primary.main'
                  }
                }} key={menu.title ? menu.id : menu.subheader}>
                  {menu.title && !menu.children ? (
                    <ListItemButton sx={{ py: 0.5, px: 1 }} to={menu?.href} component={Link}>
                      <ListItemText
                        primary={menu.title}
                        secondary={menu?.href}
                        sx={{ my: 0, py: 0.5 }}
                      />
                    </ListItemButton>
                  ) : (
                    ''
                  )}
                  {menu.children ? (
                    <>
                      {menu.children.map((child) => {
                        return (
                          <ListItemButton
                            sx={{ py: 0.5, px: 1 }}
                            to={child.href}
                            component={Link}
                            key={child.title ? child.id : menu.subheader}
                          >
                            <ListItemText
                              primary={child.title}
                              secondary={child.href}
                              sx={{ my: 0, py: 0.5 }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </>
                  ) : (
                    ''
                  )}
                </Box>
              );
            })}
          </List>
        </Box>
      </Box>
    </Dialog >
  </>);
};

export default Search;
