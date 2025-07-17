import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconButton,
  Badge,
  Menu,
  Typography,
  Box,
  Divider,
  Button,
  Tab,
  Tabs,
} from "@mui/material";
import {
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { users } from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserList from "./UserList";

const FriendRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState(null);
  const [tab, setTab] = useState(0);

  const { data: requestsData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: () => users.getFriendRequests(),
    enabled: !!user?._id,
  });

  const { data: outgoingRequestsData } = useQuery({
    queryKey: ["outgoingFriendRequests"],
    queryFn: () => users.getOutgoingFriendRequests(),
    enabled: !!user?._id,
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId) => users.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries(["friendRequests"]);
      queryClient.invalidateQueries(["friends"]);
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId) => users.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries(["friendRequests"]);
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

  const pendingRequests =
    requestsData?.data?.data?.filter(
      (request) => request.status === "pending"
    ) || [];

  const getIncomingActions = (request) => (
    <Box>
      <Button
        size="small"
        color="primary"
        onClick={() => handleAccept(request._id)}
        startIcon={<CheckIcon />}
        sx={{ mr: 1 }}
      >
        Accept
      </Button>
      <Button
        size="small"
        color="error"
        onClick={() => handleReject(request._id)}
        startIcon={<CloseIcon />}
      >
        Reject
      </Button>
    </Box>
  );

  const getOutgoingSecondary = () => "Request sent";

  return (
    <>
      <IconButton color="inherit" onClick={handleClick} sx={{ ml: 1 }}>
        <Badge badgeContent={pendingRequests.length} color="error">
          <PersonAddIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 },
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Incoming" />
          <Tab label="Outgoing" />
        </Tabs>
        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Incoming Friend Requests</Typography>
            <Divider sx={{ my: 1 }} />
            <UserList
              users={pendingRequests.map((r) => ({
                ...r.sender,
                _requestId: r._id,
              }))}
              emptyText="No pending requests"
              getActions={(user) =>
                getIncomingActions({ _id: user._requestId, sender: user })
              }
              getSecondary={() => "Wants to be your friend"}
              avatarSize={40}
              divider={true}
            />
          </Box>
        )}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Outgoing Friend Requests</Typography>
            <Divider sx={{ my: 1 }} />
            <UserList
              users={
                !outgoingRequestsData?.data
                  ? []
                  : outgoingRequestsData.data.map((r) => r.to)
              }
              emptyText="No outgoing requests"
              getActions={null}
              getSecondary={getOutgoingSecondary}
              avatarSize={40}
              divider={true}
            />
          </Box>
        )}
      </Menu>
    </>
  );
};

export default FriendRequests;
