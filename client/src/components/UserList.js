import React, { useState, useMemo } from "react";
import { List, Divider, Box, CircularProgress, Typography, InputBase } from "@mui/material";
import UserListItem from "./UserListItem";

const UserList = ({
  users = [],
  loading = false,
  emptyText = "No users found",
  showSearch = false,
  searchPlaceholder = "Search...",
  onUserClick,
  selectedUserId,
  getSecondary,
  getActions,
  avatarSize = 40,
  divider = true,
  sx = {},
}) => {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  return (
    <Box sx={{ ...sx }}>
      {showSearch && (
        <InputBase
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{
            width: "100%",
            mb: 2,
            px: 2,
            py: 1,
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            background: "#fafbfc",
            fontSize: 14,
          }}
        />
      )}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={28} />
        </Box>
      ) : filteredUsers.length === 0 ? (
        <Typography sx={{ color: "#888", fontSize: 16, p: 2, textAlign: "center" }}>{emptyText}</Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {filteredUsers.map((user, idx) => (
            <React.Fragment key={user._id || user.id || idx}>
              <UserListItem
                user={user}
                onClick={onUserClick ? () => onUserClick(user) : undefined}
                selected={selectedUserId === (user._id || user.id)}
                secondary={getSecondary ? getSecondary(user) : undefined}
                actions={getActions ? getActions(user) : undefined}
                avatarSize={avatarSize}
              />
              {divider && idx < filteredUsers.length - 1 && <Divider sx={{ ml: 7, mr: 0 }} />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default UserList; 