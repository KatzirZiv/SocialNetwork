import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Avatar,
  InputAdornment,
  CircularProgress,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { groups } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Groups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    privacy: "public"
  });
  const [createError, setCreateError] = useState("");

  // Fetch all groups
  const {
    data: groupsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: () => groups.getAll(),
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (data) => groups.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["groups"]);
      setCreateDialogOpen(false);
      setNewGroup({ name: "", description: "", privacy: "public" });
      setCreateError("");
    },
    onError: (error) => {
      // Try to extract error messages from backend
      let msg = "Failed to create group.";
      if (error.response?.data?.errors) {
        msg = error.response.data.errors.map(e => e.msg).join(" ");
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      setCreateError(msg);
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: (groupId) => groups.leave(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries(["groups"]);
    },
  });

  // Custom hook for per-group join request state
  function useMyJoinRequest(groupId, userId) {
    return useQuery({
      queryKey: ['myJoinRequest', groupId, userId],
      queryFn: () => groups.getMyJoinRequest(groupId),
      enabled: !!userId,
    });
  }

  // Update cancelJoinRequestMutation and joinGroupMutation to invalidate per-group join request state
  const cancelJoinRequestMutation = useMutation({
    mutationFn: (groupId) => groups.cancelJoinRequest(groupId),
    onSuccess: (data, groupId) => {
      queryClient.invalidateQueries(['myJoinRequest', groupId, user?._id]);
      queryClient.invalidateQueries(["groups"]);
    },
    onSettled: (data, error, groupId) => {
      queryClient.invalidateQueries(['myJoinRequest', groupId, user?._id]);
    },
  });
  const joinGroupMutation = useMutation({
    mutationFn: (groupId) => groups.join(groupId),
    onSuccess: (data, groupId) => {
      queryClient.invalidateQueries(['myJoinRequest', groupId, user?._id]);
      queryClient.invalidateQueries(["groups"]);
    },
    onSettled: (data, error, groupId) => {
      queryClient.invalidateQueries(['myJoinRequest', groupId, user?._id]);
    },
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (newGroup.name.trim()) {
      createGroupMutation.mutate(newGroup);
    }
  };

  const handleJoinGroup = (groupId, privacy) => {
    joinGroupMutation.mutate(groupId, {
      onSuccess: (data) => {
        if (privacy === 'private') {
          // No need to handle local state for private groups
        }
      },
      onError: (error) => {
        if (error.message === 'Join request already sent') {
          // No need to handle local state for already sent requests
        }
      }
    });
  };

  const handleLeaveGroup = (groupId) => {
    leaveGroupMutation.mutate(groupId);
  };

  const filteredGroups =
    groupsData?.data?.data?.filter(
      (group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  function GroupCardWithJoinState({
    group,
    user,
    navigate,
    handleLeaveGroup,
    leaveGroupMutation
  }) {
    const { data: myJoinRequestData, isLoading: joinReqLoading, refetch } = useMyJoinRequest(group._id, user?._id);
    const myJoinRequest = myJoinRequestData?.data?.data;

    return (
      <Grid gridColumn="span 12" sx={{ '@media (min-width:600px)': { gridColumn: 'span 6' }, '@media (min-width:900px)': { gridColumn: 'span 4' } }} key={group._id}>
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Avatar
                src={group.coverImage ? `http://localhost:5000${group.coverImage}` : "http://localhost:5000/uploads/default_cover.png"}
                sx={{ bgcolor: "primary.main", mr: 2 }}
              >
                {!group.coverImage && <GroupIcon />}
              </Avatar>
              <Typography variant="h6" component="div">
                {group.name}
              </Typography>
            </Box>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {group.description || "No description provided"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                {group.members?.length || 0} members
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {group.members?.slice(0, 3).map((member) => (
                <Chip
                  key={member._id}
                  avatar={
                    <Avatar
                      src={member.profilePicture ? `http://localhost:5000${member.profilePicture}` : "/default-profile.png"}
                      alt={member.username}
                      onError={e => { e.target.src = "/default-profile.png"; }}
                    />
                  }
                  label={member.username}
                  size="small"
                />
              ))}
              {group.members?.length > 3 && (
                <Chip
                  label={`+${group.members.length - 3} more`}
                  size="small"
                />
              )}
            </Box>
          </CardContent>
          <Divider />
          <CardActions>
            <Button
              size="small"
              onClick={() => navigate(`/groups/${group._id}`)}
              sx={{ color: "#ffb6d5", borderColor: "#ffb6d5", "&:hover": { backgroundColor: "#ffd1ea", borderColor: "#ffb6d5" } }}
            >
              View Details
            </Button>
            {group.members?.some((member) => member._id === user?._id) ? (
              <Button
                size="small"
                color="error"
                onClick={() => {
                  if (group.admin?._id === user._id) {
                    navigate(`/groups/${group._id}`, { state: { openTransferAdmin: true } });
                  } else {
                    handleLeaveGroup(group._id);
                  }
                }}
                disabled={leaveGroupMutation.isLoading}
              >
                Leave Group
              </Button>
            ) : group.privacy === 'private' ? (
              myJoinRequest?.status === 'pending' ? (
                <Button
                  size="small"
                  color="error"
                  onClick={() => cancelJoinRequestMutation.mutate(group._id)}
                  disabled={cancelJoinRequestMutation.isLoading}
                  startIcon={<CancelIcon />}
                  sx={{ backgroundColor: "#ffd1ea", color: "#ffb6d5", '&:hover': { backgroundColor: "#ffe6f2" } }}
                >
                  Cancel Request
                </Button>
              ) : (
                <Button
                  size="small"
                  color="primary"
                  onClick={() => joinGroupMutation.mutate(group._id)}
                  disabled={joinGroupMutation.isLoading}
                  sx={{ backgroundColor: "#ffb6d5", color: "#fff", "&:hover": { backgroundColor: "#ffd1ea" } }}
                >
                  Request to Join
                </Button>
              )
            ) : (
              <Button
                size="small"
                color="primary"
                onClick={() => joinGroupMutation.mutate(group._id)}
                disabled={joinGroupMutation.isLoading}
                sx={{ backgroundColor: "#ffb6d5", color: "#fff", "&:hover": { backgroundColor: "#ffd1ea" } }}
              >
                Join Group
              </Button>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  }

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Error loading groups. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            backgroundColor: "#ffb6d5",
            color: "#fff",
            "&:hover": { backgroundColor: "#ffd1ea" },
          }}
        >
          Create Group
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search groups..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {filteredGroups.length === 0 ? (
        <Alert severity="info">
          {searchQuery
            ? "No groups found matching your search."
            : "No groups available."}
        </Alert>
      ) : (
        <Grid container columns={12} spacing={3}>
          {filteredGroups.map((group) => (
            <GroupCardWithJoinState
              key={group._id}
              group={group}
              user={user}
              navigate={navigate}
              handleLeaveGroup={handleLeaveGroup}
              leaveGroupMutation={leaveGroupMutation}
            />
          ))}
        </Grid>
      )}

      <Dialog
        open={createDialogOpen}
        onClose={() => { setCreateDialogOpen(false); setCreateError(""); }}
      >
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>
          )}
          <Box component="form" onSubmit={handleCreateGroup} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Group Name"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              margin="normal"
              required
              error={!newGroup.name.trim()}
              helperText={!newGroup.name.trim() ? "Group name is required" : ""}
            />
            <TextField
              fullWidth
              label="Description"
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
            <TextField
              select
              fullWidth
              label="Privacy"
              value={newGroup.privacy}
              onChange={e => setNewGroup({ ...newGroup, privacy: e.target.value })}
              margin="normal"
              SelectProps={{ native: true }}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); setCreateError(""); }}>Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroup.name.trim() || createGroupMutation.isLoading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Groups;
