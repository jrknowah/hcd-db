import { Grid, Box, Typography, Avatar } from "@mui/material";
import PageContainer from 'src/components/container/PageContainer';
import AuthLogo from "src/layouts/full/shared/logo/AuthLogo";
import AuthTwoSteps from "../authForms/AuthTwoSteps";
import img1 from 'src/assets/images/backgrounds/user-login.png';
import { CustomizerContext } from "src/context/CustomizerContext";
import { useContext } from "react";

export default function TwoSteps() {

  const { activeMode } = useContext(CustomizerContext);

  return (
    <PageContainer title="Two steps Page" description="this is Sample page">
      <Grid
        container
        spacing={0}
        justifyContent="center"
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
                    Two Step Verification
                  </Typography>

                  <Typography
                    variant="subtitle1"
                    color="textSecondary"
                    mt={2}
                    mb={1}
                  >
                    We sent a verification code to your mobile. Enter the code
                    from the mobile in the field below.
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="700" mb={1}>
                    ******1234
                  </Typography>
                  <AuthTwoSteps />
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
    </PageContainer>
  );
}
