import React from "react";
import { ListItem, ListItemAvatar, ListItemText, Box, ListItemButton } from "@mui/material";
import UserAvatar from "./UserAvatar";

const UserListItem = ({
  user,
  onClick,
  selected = false,
  secondary = null,
  actions = null,
  avatarSize = 40,
  sx = {},
  ...props
}) => {
  const content = (
    <>
      <ListItemAvatar sx={{ minWidth: 0, mr: 1 }}>
        <UserAvatar user={user} size={avatarSize} sx={{ fontSize: avatarSize / 2, cursor: onClick ? "pointer" : undefined }} />
      </ListItemAvatar>
      <ListItemText
        primary={user.username}
        secondary={secondary}
        sx={{ m: 0, flexGrow: 1, minWidth: 0 }}
      />
      {actions && <Box>{actions}</Box>}
    </>
  );

  return onClick ? (
    <ListItemButton
      onClick={onClick}
      selected={selected}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 1.5,
        px: 0,
        minHeight: 48,
        ...sx,
      }}
      {...props}
    >
      {content}
    </ListItemButton>
  ) : (
    <ListItem
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 1.5,
        px: 0,
        minHeight: 48,
        ...sx,
      }}
      {...props}
    >
      {content}
    </ListItem>
  );
};

export default UserListItem; 