import { useState } from "react";

import { IconX } from "@tabler/icons-react";
import {
  Box,
  Typography,
  Badge,
  Drawer,
  IconButton,

} from "@mui/material";

import CartItems from "./CartItem";
import { Icon } from "@iconify/react";

const Cart = () => {

  const [showDrawer, setShowDrawer] = useState(false);
  const handleDrawerClose = () => {
    setShowDrawer(false);
  };

  const cartContent = (
    <Box>
      {/* ------------------------------------------- */}
      {/* Cart Content */}
      {/* ------------------------------------------- */}
      <Box>
        <CartItems />
      </Box>
    </Box>
  );

  return (
    (<Box>
      <IconButton
        size="large"
        color="inherit"
        onClick={() => setShowDrawer(true)}
        sx={{
          color: "warning.contrastText",
          ...(showDrawer && {
            color: "primary.main",
          }),
        }}
      >
        <Badge color="error" badgeContent={0  }>
          <Icon icon="solar:cart-2-line-duotone" height={20} />
        </Badge>
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Cart Sidebar */}
      {/* ------------------------------------------- */}
      <Drawer
        anchor="right"
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        slotProps={{
          paper: { sx: { maxWidth: "500px" } }
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          p={3}
          pb={0}
          justifyContent="space-between"
        >
          <Typography variant="h5" fontWeight={600}>
            Shopping Cart
          </Typography>
          <Box>
            <IconButton
              color="inherit"
              
              onClick={handleDrawerClose}
            >
              <IconX size="1rem" />
            </IconButton>
          </Box>
        </Box>

        {/* component */}
        {cartContent}

      </Drawer>
    </Box>)
  );
};

export default Cart;
