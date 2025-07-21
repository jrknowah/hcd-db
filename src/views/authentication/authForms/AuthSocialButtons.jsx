import CustomSocialButton from "src/components/forms/theme-elements/CustomSocialButton";
import { Stack } from "@mui/system";
import { Avatar } from "@mui/material";

import icon1 from 'src/assets/images/svgs/google-icon.svg';
import icon2 from 'src/assets/images/svgs/facebook-icon.svg';

const AuthSocialButtons = () => (
  <>
    <Stack direction="row" justifyContent="center" spacing={2} mt={3}>
      <CustomSocialButton>
        <Avatar
          src={icon1}
          alt={"icon1"}
          sx={{
            width: 16,
            height: 16,
            borderRadius: 0,
            mr: 1,
          }}
        />
        Google
      </CustomSocialButton>
      <CustomSocialButton>
        <Avatar
          src={icon2}
          alt={"icon2"}
          sx={{
            width: 25,
            height: 25,
            borderRadius: 0,
            mr: 1,
          }}
        />
        Facebook
      </CustomSocialButton>
    </Stack>
  </>
);

export default AuthSocialButtons;
