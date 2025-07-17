import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Cancel as CancelIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { users } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useNotifications from "../hooks/useNotifications";
import UserAvatar from "./UserAvatar";
import UserList from "./UserList";

const AddFriend = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { fetchNotifications } = useNotifications(user?._id || user?.id);

  // Search users
  const searchMutation = useMutation({
    mutationFn: async (query) => {
      const response = await users.search(query);
      return response;
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.response?.data?.error || "Error searching users");
    },
  });

  // Debounced search effect
  useEffect(() => {
    setError(null); // Clear error on new search
    setSuccess(null);
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 3) {
        setLoading(true);
        searchMutation.mutate(searchQuery, {
          onSettled: () => {
            setLoading(false);
          },
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Send/cancel/accept friend request mutations
  const sendRequestMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await users.sendFriendRequest(userId);
      return response;
    },
    onSuccess: () => {
      if (searchQuery) searchMutation.mutate(searchQuery);
      fetchNotifications();
      setSuccess("Friend request sent!");
      setTimeout(() => setSuccess(null), 2000);
    },
    onError: (error) => {
      setError(error.message || "Error sending friend request");
      setTimeout(() => setError(null), 3000);
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      return await users.cancelFriendRequest(requestId);
    },
    onSuccess: () => {
      if (searchQuery) searchMutation.mutate(searchQuery);
      fetchNotifications();
      setSuccess("Friend request cancelled.");
      setTimeout(() => setSuccess(null), 2000);
    },
    onError: (error) => {
      setError(error.message || "Error cancelling friend request");
      setTimeout(() => setError(null), 3000);
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      return await users.acceptFriendRequest(requestId);
    },
    onSuccess: () => {
      if (searchQuery) searchMutation.mutate(searchQuery);
      fetchNotifications();
      setSuccess("Friend request accepted!");
      setTimeout(() => setSuccess(null), 2000);
    },
    onError: (error) => {
      setError(error.message || "Error accepting friend request");
      setTimeout(() => setError(null), 3000);
    },
  });

  // Refetch search results after friend request mutation succeeds
  useEffect(() => {
    if (
      sendRequestMutation.isSuccess ||
      cancelRequestMutation.isSuccess ||
      acceptRequestMutation.isSuccess
    ) {
      if (searchQuery.trim().length >= 3) {
        searchMutation.mutate(searchQuery);
      }
      sendRequestMutation.reset && sendRequestMutation.reset();
      cancelRequestMutation.reset && cancelRequestMutation.reset();
      acceptRequestMutation.reset && acceptRequestMutation.reset();
    }
  }, [
    sendRequestMutation.isSuccess,
    cancelRequestMutation.isSuccess,
    acceptRequestMutation.isSuccess,
  ]);

  // Filter out current user from search results
  const usersList =
    searchResults?.data?.filter((searchUser) => {
      const isNotCurrentUser = searchUser._id !== (user?.id || user?._id);
      return isNotCurrentUser;
    }) || [];

  // Button logic using only backend fields
  const getFriendButtonState = (searchUser) => {
    if (searchUser.isFriend) {
      return {
        type: "icon",
        disabled: true,
        icon: <CheckIcon />,
        color: "success",
        sx: {
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "1px solid",
          borderColor: "success.main",
          color: "success.main",
          "&:hover": {
            backgroundColor: "success.light",
            borderColor: "success.main",
          },
          padding: "0",
        },
      };
    } else if (searchUser.outgoingFriendRequestId) {
      return {
        type: "button",
        text: "Cancel Request",
        disabled: cancelRequestMutation.isLoading,
        icon: <CancelIcon />,
        color: "error",
        variant: "outlined",
        sx: {
          minWidth: "120px",
          borderRadius: "20px",
          textTransform: "none",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          px: "12px",
        },
      };
    } else if (searchUser.incomingFriendRequestId) {
      return {
        type: "button",
        text: "Accept",
        disabled: acceptRequestMutation.isLoading,
        icon: <PersonAddIcon />,
        color: "primary",
        variant: "contained",
        sx: {
          minWidth: "100px",
          borderRadius: "20px",
          textTransform: "none",
          fontWeight: 500,
          borderColor: "#ffb6d5",
          color: "#ffb6d5",
          "&:hover": { backgroundColor: "#ffd1ea", borderColor: "#ffb6d5" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          px: "12px",
        },
      };
    } else {
      return {
        type: "button",
        text: "Add Friend",
        disabled: sendRequestMutation.isLoading,
        icon: <PersonAddIcon />,
        color: "primary",
        variant: "contained",
        sx: {
          minWidth: "120px",
          borderRadius: "20px",
          textTransform: "none",
          fontWeight: 500,
          backgroundColor: "#ffb6d5",
          color: "#fff",
          "&:hover": { backgroundColor: "#ffd1ea" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          px: "12px",
        },
      };
    }
  };

  // Button actions
  const handleSendOrCancelRequest = async (searchUser) => {
    if (searchUser.outgoingFriendRequestId) {
      try {
        await cancelRequestMutation.mutateAsync(
          searchUser.outgoingFriendRequestId
        );
      } catch (error) {
        // error handled by mutation
      }
    } else if (searchUser.incomingFriendRequestId) {
      try {
        await acceptRequestMutation.mutateAsync(
          searchUser.incomingFriendRequestId
        );
      } catch (error) {}
    } else if (!searchUser.isFriend) {
      try {
        await sendRequestMutation.mutateAsync(searchUser._id);
      } catch (error) {}
    }
  };

  const getActions = (searchUser) => {
    const buttonState = getFriendButtonState(searchUser);
    if (buttonState.type === "icon") {
      return (
        <IconButton
          disabled={buttonState.disabled}
          color={buttonState.color}
          sx={buttonState.sx}
        >
          {buttonState.icon}
        </IconButton>
      );
    } else {
      return (
        <Button
          variant={buttonState.variant}
          size="small"
          startIcon={buttonState.icon}
          onClick={() => handleSendOrCancelRequest(searchUser)}
          disabled={buttonState.disabled}
          color={buttonState.color}
          sx={buttonState.sx}
        >
          {buttonState.text}
        </Button>
      );
    }
  };

  const handleProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: "transparent" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <Box sx={{ color: "text.secondary", mr: 1 }}>
                <PersonIcon />
              </Box>
            ),
            sx: {
              borderRadius: "20px",
              backgroundColor: "background.paper",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "primary.main",
              },
            },
          }}
        />
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Snackbar
        open={!!success}
        autoHideDuration={2000}
        onClose={() => setSuccess(null)}
        message={success}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress />
        </Box>
      ) : searchQuery.length >= 3 ? (
        <UserList
          users={usersList}
          loading={loading}
          emptyText="No users found"
          getActions={getActions}
          avatarSize={48}
          divider={true}
          onUserClick={user => handleProfileClick(user._id)}
          selectedUserId={null}
          showSearch={false}
        />
      ) : null}
    </Box>
  );
};

export default AddFriend;
