import { Box, Typography, Button } from "@mui/material";
import { Link } from 'react-router';
import emptyCart from "src/assets/images/products/empty-shopping-cart.svg";



const CartItems = () => {
  return (
    <Box px={3}>
      <Box textAlign="center" mb={3}>
        <img src={emptyCart} alt="cart" width={200} />
        <Typography variant="h5" mb={2}>
          Cart is Empty
        </Typography>
        <Button
          component={Link}
          to="/"
          variant="contained"
        >
          Go back to Shopping
        </Button>
      </Box>
    </Box>
  );
};

export default CartItems;
