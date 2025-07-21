import { Box, Typography, Button, Divider } from "@mui/material";
import { Link } from 'react-router';
import CustomTextField from "src/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import { Stack } from "@mui/system";
import AuthSocialButtons from "./AuthSocialButtons";

const AuthRegister = ({ title, subtitle, subtext }) => (
  <>
    {title ? (
      <Typography fontWeight="700" variant="h3" mb={1}>
        {title}
      </Typography>
    ) : null}

    {subtext}
    <AuthSocialButtons />

    <Box mt={3}>
      <Divider>
        <Typography
          component="span"
          variant="h6"
          fontWeight="400"
          position="relative"
          px={2}
        >
          or sign up with
        </Typography>
      </Divider>
    </Box>

    <Box>
      <Stack mb={3}>
        <CustomFormLabel htmlFor="name">Name</CustomFormLabel>
        <CustomTextField id="name" variant="outlined" fullWidth />
        <CustomFormLabel htmlFor="email">Email Adddress</CustomFormLabel>
        <CustomTextField id="email" variant="outlined" fullWidth />
        <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
        <CustomTextField id="password" variant="outlined" fullWidth />
      </Stack>
      <Button
        color="primary"
        variant="contained"
        size="large"
        fullWidth
        component={Link}
        to="/auth/auth1/login"
      >
        Sign Up
      </Button>
    </Box>
    {subtitle}
  </>
);

export default AuthRegister;
