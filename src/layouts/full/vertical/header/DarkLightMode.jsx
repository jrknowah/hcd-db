import { useContext } from 'react';
import { IconButton, Box } from "@mui/material";
import { Icon } from "@iconify/react";
import { CustomizerContext } from "src/context/CustomizerContext";


const DarkLightMode = () => {
  const { activeMode, setActiveMode } = useContext(CustomizerContext);

  return (
    <Box color="white">
      <IconButton aria-label="show 4 new mails" color="inherit" size="large">
        {activeMode === "light" ? (
          <Icon
            icon="solar:moon-line-duotone"
            height={20}
            onClick={() => setActiveMode("dark")}
          />
        ) : (
          <Icon
            icon="solar:sun-2-line-duotone"
            height={20}
            onClick={() => setActiveMode("light")}
          />
        )}
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
    </Box>
  );
};

export default DarkLightMode;
