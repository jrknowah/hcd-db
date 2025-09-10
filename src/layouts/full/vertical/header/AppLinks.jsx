import { Box, Typography, Grid, Stack } from "@mui/material";
import * as dropdownData from "./data";
import { Link } from 'react-router-dom';

import { Icon } from "@iconify/react";

const AppLinks = () => {
  return (
    (<Grid container spacing={3} mb={4}>
      {dropdownData.appsLink.map((links, index) => {
        const bgvalue = links.bgcolor;
        const colorvalue = links.color;
        return (
          (<Grid
            key={index}
            size={{
              lg: 6
            }}>
            <Link to={links.href} className="hover-text-primary">
              <Stack direction="row" spacing={2}>
                <Box
                  minWidth="40px"
                  height="40px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    bgcolor: `${bgvalue}`,
                    color: `${colorvalue}`,
                    borderRadius: "50px",
                  }}
                >
                  <Icon icon={links.icon} height={20} />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={500}
                    color="textPrimary"
                    noWrap
                    className="text-hover"
                    sx={{
                      width: "240px",
                    }}
                  >
                    {links.title}
                  </Typography>
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    fontSize="14px"
                    fontWeight={400}
                    sx={{
                      width: "240px",
                      lineHeight: 1,
                    }}
                    noWrap
                  >
                    {links.subtext}
                  </Typography>
                </Box>
              </Stack>
            </Link>
          </Grid>)
        );
      })}
    </Grid>)
  );
};

export default AppLinks;
