import { Grid, Box, Typography, Avatar } from "@mui/material";
import AuthLogo from "src/layouts/full/shared/logo/AuthLogo";
import PageContainer from 'src/components/container/PageContainer';
import AuthForgotPassword from "../authForms/AuthForgotPassword";
import { CustomizerContext } from 'src/context/CustomizerContext';
import img1 from 'src/assets/images/backgrounds/user-login.png';
import { useContext } from "react";

export default function ForgotPassword() {

  const { activeMode } = useContext(CustomizerContext);

  return (
    (<PageContainer
      title="Forgot Password Page"
      description="this is Sample page"
    >
      <Grid
        container
        justifyContent="center"
        spacing={0}
        sx={{
          height: "100vh",
          backgroundColor:
            activeMode == "light" ? "white" : "background.default",
        }}
      >
        <Grid
          size={{
            xs: 12,
            sm: 12,
            lg: 3,
            xl: 4
          }}>
          <Box px={3}>
            <AuthLogo />
          </Box>
          <Grid
            container
            justifyContent="center"
            alignItems="center"
            height="calc(100% - 64px)"
          >
            <Grid
              size={{
                xs: 12,
                lg: 8
              }}>
              <Box display="flex" flexDirection="column">
                <Box p={4}>
                  <Typography variant="h4" fontWeight="700">
                    Forgot your password?
                  </Typography>

                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    fontWeight="400"
                    mt={2}
                  >
                    Please enter the email address associated with your account
                    and We will email you a link to reset your password.
                  </Typography>
                  <AuthForgotPassword />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Grid>
        <Grid
          sx={{
            position: "relative",
            "&:before": {
              content: '""',
              background: "radial-gradient(#d2f1df, #d3d7fa, #bad8f4)",
              backgroundSize: "400% 400%",
              animation: "gradient 15s ease infinite",
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: "0.3",
            },
          }}
          size={{
            xs: 12,
            sm: 12,
            lg: 9,
            xl: 8
          }}>
          <Box position="relative">
            <Box
              alignItems="center"
              justifyContent="center"
              height={"calc(100vh - 75px)"}
              sx={{
                display: {
                  xs: "none",
                  lg: "flex",
                },
              }}
            >
              <Avatar
                src={img1}
                alt="bg"
                sx={{
                  borderRadius: 0,
                  width: "100%",
                  height: "100%",
                  maxWidth: "676px",
                  maxHeight: "450px",
                }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </PageContainer>)
  );
}
