import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Divider,
  Button,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { users } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FriendRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState(null);

  const { data: requestsData } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => users.getFriendRequests(),
    enabled: !!user?._id,
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId) => users.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries(['friendRequests']);
      queryClient.invalidateQueries(['friends']);
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId) => users.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries(['friendRequests']);
    },
  });

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAccept = (requestId) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleReject = (requestId) => {
    rejectRequestMutation.mutate(requestId);
  };

  const pendingRequests = requestsData?.data?.filter(
    (request) => request.status === 'pending'
  ) || [];

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ ml: 1 }}
      >
        <Badge badgeContent={pendingRequests.length} color="error">
          <PersonAddIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Friend Requests</Typography>
        </Box>
        <Divider />
        {pendingRequests.length === 0 ? (
          <MenuItem>
            <ListItemText primary="No pending requests" />
          </MenuItem>
        ) : (
          pendingRequests.map((request) => (
            <MenuItem key={request._id} sx={{ py: 1 }}>
              <ListItemAvatar>
                <Avatar
                  src={request.from.profilePicture ? `http://localhost:5000${request.from.profilePicture}` : undefined}
                  alt={request.from.username}
                />
              </ListItemAvatar>
              <ListItemText
                primary={request.from.username}
                secondary="Wants to be your friend"
              />
              <Box>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => handleAccept(request.from._id)}
                  startIcon={<CheckIcon />}
                  sx={{ mr: 1 }}
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleReject(request.from._id)}
                  startIcon={<CloseIcon />}
                >
                  Reject
                </Button>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

export default FriendRequests; 