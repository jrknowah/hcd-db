import { Grid, Box, Card, Typography } from "@mui/material";
import AuthLogo from "src/layouts/full/shared/logo/AuthLogo";
import PageContainer from 'src/components/container/PageContainer';
import AuthTwoSteps from "../authForms/AuthTwoSteps";

export default function TwoSteps2() {
  return (
    <PageContainer title="Two steps Page" description="this is Sample page">
      <Box
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
      >
        <Grid
          container
          spacing={0}
          justifyContent="center"
          sx={{ height: "100vh" }}
        >
          <Grid
            display="flex"
            justifyContent="center"
            alignItems="center"
            size={{
              xs: 12,
              sm: 12,
              lg: 5,
              xl: 4
            }}>
            <Card
              elevation={9}
              sx={{ p: 4, pt: 2, zIndex: 1, width: "100%", maxWidth: "450px" }}
            >
              <Box display="flex" alignItems="center" justifyContent="center">
                <AuthLogo />
              </Box>
              <Typography
                variant="subtitle1"
                textAlign="center"
                color="textSecondary"
                mb={1}
              >
                We sent a verification code to your mobile. Enter the code from
                the mobile in the field below.
              </Typography>
              <Typography
                variant="subtitle1"
                textAlign="center"
                fontWeight="700"
                mb={1}
              >
                ******1234
              </Typography>
              <AuthTwoSteps />
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
}
