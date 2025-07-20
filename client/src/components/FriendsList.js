import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
} from "@mui/material";
import {
  Person as PersonIcon,
  PersonRemove as PersonRemoveIcon,
  Message as MessageIcon,
} from "@mui/icons-material";
import { users } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AddFriend from "./AddFriend";
import UserList from "./UserList";

const FriendsList = ({ compact }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [findFriendsOpen, setFindFriendsOpen] = React.useState(false);

  const { data: friendsData, isLoading } = useQuery({
    queryKey: ["friends", user?._id],
    queryFn: () => users.getFriends(user?._id),
    enabled: !!user?._id,
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId) => users.removeFriend(user._id, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries(["friends", user?._id]);
    },
  });

  const handleRemoveFriend = (friendId) => {
    removeFriendMutation.mutate(friendId);
  };

  const handleMessage = (friend) => {
    navigate("/chat", {
      state: {
        userId: friend._id,
        username: friend.username,
        profilePicture: friend.profilePicture,
      },
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Ensure friends is always an array
  const friends = Array.isArray(friendsData?.data?.data)
    ? friendsData.data.data
    : [];

  // Filter friends by search (case-insensitive)
  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  // Action renderers for UserList
  const getActions = (friend) => {
    if (compact) {
      return (
        <IconButton
          edge="end"
          aria-label="message"
          onClick={() => handleMessage(friend)}
          sx={{ ml: 0.5 }}
        >
          <MessageIcon fontSize="small" />
        </IconButton>
      );
    }
    return (
      <Box>
        <IconButton
          edge="end"
          aria-label="message"
          onClick={() => handleMessage(friend)}
          sx={{ mr: 1 }}
        >
          <MessageIcon fontSize="small" />
        </IconButton>
        <IconButton
          edge="end"
          aria-label="remove"
          onClick={() => handleRemoveFriend(friend._id)}
        >
          <PersonRemoveIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  const getSecondary = (friend) => (compact ? null : "Friend");

  return (
    <>
      {!compact && <AddFriend />}
      <Box sx={{ p: compact ? 0 : 2, pt: compact ? 0 : 2 }}>
        {!compact && (
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: 600, fontSize: 18, color: "#333" }}
          >
            Friends
          </Typography>
        )}
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: compact ? 16 : 18,
            mb: compact ? 1 : 2,
            color: "#333",
          }}
        >
          Friends{friends.length > 0 ? ` (${friends.length})` : ""}
        </Typography>
        {compact && (
          <Box sx={{ mb: 1 }}>
            <input
              type="text"
              placeholder="Search Friends"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 12px",
                borderRadius: 16,
                border: "1px solid #e0e0e0",
                fontSize: 14,
                outline: "none",
                marginBottom: 4,
                background: "#fafbfc",
              }}
            />
          </Box>
        )}
        <UserList
          users={filteredFriends}
          loading={isLoading}
          emptyText={
            compact ? "No friends found" : "Add friends to see them here"
          }
          getActions={getActions}
          getSecondary={getSecondary}
          avatarSize={compact ? 32 : 40}
          divider={true}
          onUserClick={(friend) => navigate(`/profile/${friend._id}`)}
          selectedUserId={null}
          showSearch={false}
        />
        {compact && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <button
              style={{
                background: "#42a5f5",
                color: "#fff",
                border: "none",
                borderRadius: 16,
                padding: "6px 18px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(66, 165, 245, 0.08)",
                transition: "background 0.2s",
              }}
              onMouseOver={e => e.currentTarget.style.background = "#90caf9"}
              onMouseOut={e => e.currentTarget.style.background = "#42a5f5"}
              onClick={() => setFindFriendsOpen(true)}
            >
              Find a new Friend
            </button>
          </Box>
        )}
      </Box>
      <Dialog
        open={findFriendsOpen}
        onClose={() => setFindFriendsOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Find Friends</DialogTitle>
        <Box sx={{ p: 2 }}>
          <AddFriend />
        </Box>
      </Dialog>
    </>
  );
};

export default FriendsList;
