import { Link } from 'react-router-dom';
import { Grid, Box, Typography, Stack, Avatar } from "@mui/material";
import PageContainer from 'src/components/container/PageContainer';
import AuthLogo from "src/layouts/full/shared/logo/AuthLogo";
import img1 from 'src/assets/images/backgrounds/user-login.png';
import AuthRegister from "../authForms/AuthRegister";
import { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';

export default function Register() {
  const { activeMode } = useContext(CustomizerContext);


  return (
    <PageContainer title="Register Page" description="this is Sample page">
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
                  <AuthRegister
                    title="Welcome to MaterialPro"
                    subtext={
                      <Typography
                        variant="subtitle1"
                        color="textSecondary"
                        mb={1}
                      >
                        Your Admin Dashboard
                      </Typography>
                    }
                    subtitle={
                      <Stack direction="row" justifyContent='center' spacing={1} mt={3}>
                        <Typography
                          color="textSecondary"
                          variant="h6"
                          fontWeight="400"
                        >
                          Already have an Account?
                        </Typography>
                        <Typography
                          component={Link}
                          to="/auth/auth1/login"
                          fontWeight="500"
                          sx={{
                            textDecoration: "none",
                            color: "primary.main",
                          }}
                        >
                          Sign In
                        </Typography>
                      </Stack>
                    }
                  />
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
              background: "radial-gradient(#d2f1df,#d3d7fa,#bad8f4)",
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
