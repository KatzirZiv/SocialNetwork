import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { groups } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Groups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
  });

  // Fetch all groups
  const { data: groupsData, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groups.getAll(),
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (data) => groups.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setCreateDialogOpen(false);
      setNewGroup({ name: '', description: '' });
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: (groupId) => groups.join(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: (groupId) => groups.leave(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
    },
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (newGroup.name.trim()) {
      createGroupMutation.mutate(newGroup);
    }
  };

  const handleJoinGroup = (groupId) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleLeaveGroup = (groupId) => {
    leaveGroupMutation.mutate(groupId);
  };

  const filteredGroups = groupsData?.data?.data?.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
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
          {searchQuery ? 'No groups found matching your search.' : 'No groups available.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredGroups.map((group) => (
            <Grid columns={12} sm={6} md={4} key={group._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <GroupIcon />
                    </Avatar>
                    <Typography variant="h6" component="div">
                      {group.name}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {group.description || 'No description provided'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      {group.members?.length || 0} members
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.members?.slice(0, 3).map((member) => (
                      <Chip
                        key={member._id}
                        avatar={<Avatar src={member.profilePicture} alt={member.username} />}
                        label={member.username}
                        size="small"
                      />
                    ))}
                    {group.members?.length > 3 && (
                      <Chip label={`+${group.members.length - 3} more`} size="small" />
                    )}
                  </Box>
                </CardContent>
                <Divider />
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => navigate(`/groups/${group._id}`)}
                  >
                    View Details
                  </Button>
                  {group.members?.some((member) => member._id === user?._id) ? (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleLeaveGroup(group._id)}
                      disabled={leaveGroupMutation.isLoading}
                    >
                      Leave Group
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleJoinGroup(group._id)}
                      disabled={joinGroupMutation.isLoading}
                    >
                      Join Group
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleCreateGroup} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Group Name"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              margin="normal"
              required
              error={!newGroup.name.trim()}
              helperText={!newGroup.name.trim() ? 'Group name is required' : ''}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
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