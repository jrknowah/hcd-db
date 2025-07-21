import React, { useContext } from "react";
import { Link } from 'react-router';

// mui imports
import {
  ListItemIcon,
  List,
  styled,
  ListItemText,
  Chip,
  useTheme,
  Typography,
  ListItemButton,
  useMediaQuery,
} from "@mui/material";
import { CustomizerContext } from "src/context/CustomizerContext";

import { useTranslation } from "react-i18next";

import { Icon } from "@iconify/react";



export default function NavItem({
  item,
  level,
  pathDirect,
  hideMenu,
  onClick,
}) {
  const lgDown = useMediaQuery((theme) => theme.breakpoints.down("lg"));

  const { isBorderRadius } = useContext(CustomizerContext);


  const theme = useTheme();
  const { t } = useTranslation();
  const itemIcon =
    level > 1 ? (
      <Icon icon={item.icon} height={14} />
    ) : (
      <Icon icon={item.icon} height={20} />
    );

  const ListItemStyled = styled((props) => <ListItemButton  {...props} />)(() => ({
    whiteSpace: "nowrap",
    padding: "7px 20px",
    gap: "10px",
    borderRadius: `${isBorderRadius * 3}px`,
    backgroundColor: level > 1 ? "transparent !important" : "inherit",
    marginBottom: level > 1 ? "3px" : "0px",
    color:
      level > 1 && pathDirect === item?.href
        ? `${theme.palette.secondary.main}!important`
        : theme.palette.text.primary,
    "&:hover": {
      backgroundColor: theme.palette.secondary.light,
      color: theme.palette.secondary.main,
    },
    "&.Mui-selected": {
      color: "white",
      backgroundColor: theme.palette.secondary.main,
      "&:hover": {
        backgroundColor: theme.palette.secondary.main,
        color: "white",
      },
    },
  }));



  return (
    <List disablePadding key={item?.id && item.title}>
      <Link to={item.href} >
        <ListItemStyled
          disabled={item?.disabled}
          selected={pathDirect === item?.href}
          onClick={lgDown ? onClick : undefined}
        >
          <ListItemIcon
            sx={{
              minWidth: "auto",
              p: "3px 0",
              color:
                level > 1 && pathDirect === item?.href
                  ? `${theme.palette.secondary.main}!important`
                  : "inherit",
            }}
          >
            {itemIcon}
          </ListItemIcon>
          <ListItemText>
            {hideMenu ? "" : <>{t(`${item?.title}`)}</>}
            <br />
            {item?.subtitle ? (
              <Typography variant="caption">
                {hideMenu ? "" : item?.subtitle}
              </Typography>
            ) : (
              ""
            )}
          </ListItemText>

          {!item?.chip || hideMenu ? null : (
            <Chip
              color={item?.chipColor}
              variant={item?.variant ? item?.variant : "filled"}
              size="small"
              label={item?.chip}
            />
          )}
        </ListItemStyled>
      </Link>
    </List>
  );
}
