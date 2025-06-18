import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tabs,
  Tab,
  Chip,
  Alert,
  Autocomplete,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { groups, posts, users } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Group = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
  });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const {
    data: groupData,
    isLoading: groupLoading,
    error: groupError,
  } = useQuery({
    queryKey: ["group", id],
    queryFn: () => groups.getById(id),
  });

  const {
    data: groupPosts,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ["groupPosts", id],
    queryFn: () => posts.getAll({ group: id }),
  });

  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", currentUser?._id],
    queryFn: () => users.getFriends(currentUser?._id),
    enabled: !!currentUser?._id,
  });

  const joinGroupMutation = useMutation({
    mutationFn: () => groups.join(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: () => groups.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: (data) => groups.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setEditDialogOpen(false);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => groups.delete(id),
    onSuccess: () => {
      navigate("/groups");
    },
  });

  const createPostMutation = useMutation({
    mutationFn: (formData) => posts.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(["groupPosts", id]);
      setNewPost("");
      setImageFile(null);
      setImagePreview(null);
    },
  });

  const likePostMutation = useMutation({
    mutationFn: (postId) => posts.like(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(["groupPosts", id]);
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => groups.invite(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setInviteDialogOpen(false);
      setSelectedFriend(null);
    },
  });

  const handleEditGroup = () => {
    if (groupData?.data?.data) {
      setEditForm({
        name: groupData.data.data.name,
        description: groupData.data.data.description || "",
      });
      setEditDialogOpen(true);
    }
  };

  const handleUpdateGroup = () => {
    updateGroupMutation.mutate(editForm);
  };

  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate();
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPost.trim() && !imageFile) return;
    const formData = new FormData();
    formData.append("content", newPost);
    formData.append("group", id);
    if (imageFile) {
      formData.append("media", imageFile);
    }
    createPostMutation.mutate(formData);
  };

  const handleLike = (postId) => {
    likePostMutation.mutate(postId);
  };

  const handleInviteFriend = () => {
    if (selectedFriend) {
      inviteMemberMutation.mutate({ groupId: id, userId: selectedFriend._id });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredFriends =
    friendsData?.data?.data?.filter((friend) => {
      const isNotMember = !group?.members?.some(
        (member) => member._id === friend._id
      );
      const matchesSearch = friend.username
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return isNotMember && matchesSearch;
    }) || [];

  const isAdmin = groupData?.data?.data?.admin?._id === currentUser?._id;
  const isMember = groupData?.data?.data?.members?.some(
    (member) => member._id === currentUser?._id
  );

  if (groupLoading) {
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

  if (groupError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Error loading group. Please try again later.
        </Alert>
      </Container>
    );
  }

  if (!groupData?.data?.data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Group not found</Alert>
      </Container>
    );
  }

  const group = groupData.data.data;
  const posts = groupPosts?.data?.data || [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {group.name}
            </Typography>
            <Typography color="text.secondary" paragraph>
              {group.description || "No description provided"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip
                icon={<GroupIcon />}
                label={`${group.members?.length || 0} members`}
                variant="outlined"
              />
              <Chip
                icon={<PersonIcon />}
                label={`Admin: ${group.admin?.username || "Unknown"}`}
                variant="outlined"
              />
            </Box>
          </Box>
          <Box>
            {isAdmin ? (
              <>
                <IconButton onClick={handleEditGroup} sx={{ mr: 1 }}>
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => setDeleteDialogOpen(true)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </>
            ) : isMember ? (
              <Button
                variant="outlined"
                color="error"
                onClick={() => leaveGroupMutation.mutate()}
                disabled={leaveGroupMutation.isLoading}
              >
                Leave Group
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => joinGroupMutation.mutate()}
                disabled={joinGroupMutation.isLoading}
              >
                Join Group
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {isAdmin && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite Friends
          </Button>
        </Box>
      )}

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Posts" />
        <Tab label="Members" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {isMember && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box component="form" onSubmit={handleCreatePost}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Share something with the group..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id="group-post-image-upload"
                  type="file"
                  onChange={handleImageChange}
                />
                <label htmlFor="group-post-image-upload">
                  <Button variant="outlined" component="span" sx={{ mr: 2 }}>
                    Upload Image
                  </Button>
                </label>
                {imagePreview && (
                  <Box sx={{ mb: 2 }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ maxWidth: 200, borderRadius: 8 }}
                    />
                  </Box>
                )}
                <Button
                  variant="contained"
                  type="submit"
                  disabled={
                    (!newPost.trim() && !imageFile) ||
                    createPostMutation.isLoading
                  }
                >
                  Post
                </Button>
              </Box>
            </Paper>
          )}

          {postsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : postsError ? (
            <Alert severity="error">
              Error loading posts. Please try again later.
            </Alert>
          ) : posts.length === 0 ? (
            <Alert severity="info">
              No posts yet. Be the first to share something!
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {posts.map((post) => (
                <Grid item xs={12} key={post._id}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <Avatar
                          src={post.author?.profilePicture}
                          alt={post.author?.username}
                          sx={{ mr: 2 }}
                        />
                        <Box>
                          <Typography variant="subtitle1">
                            {post.author?.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography paragraph>{post.content}</Typography>
                      {post.media && (
                        <Box sx={{ mb: 2 }}>
                          <img
                            src={post.media}
                            alt="Post media"
                            style={{ maxWidth: "100%", borderRadius: 8 }}
                          />
                        </Box>
                      )}
                    </CardContent>
                    <Divider />
                    <CardActions>
                      <IconButton
                        onClick={() => handleLike(post._id)}
                        color={
                          post.likes?.includes(currentUser?._id)
                            ? "primary"
                            : "default"
                        }
                      >
                        {post.likes?.includes(currentUser?._id) ? (
                          <ThumbUpIcon />
                        ) : (
                          <ThumbUpOutlinedIcon />
                        )}
                      </IconButton>
                      <Typography variant="body2" color="text.secondary">
                        {post.likes?.length || 0} likes
                      </Typography>
                      <IconButton>
                        <CommentIcon />
                      </IconButton>
                      <Typography variant="body2" color="text.secondary">
                        {post.comments?.length || 0} comments
                      </Typography>
                      <IconButton>
                        <ShareIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          {group.members?.length === 0 ? (
            <Alert severity="info">No members in this group yet.</Alert>
          ) : (
            <List>
              {group.members?.map((member) => (
                <ListItem
                  key={member._id}
                  secondaryAction={
                    member._id === group.admin?._id && (
                      <Chip label="Admin" color="primary" size="small" />
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={member.profilePicture} alt={member.username} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.username}
                    secondary={
                      member._id === group.admin?._id ? "Group Admin" : "Member"
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Group Name"
            value={editForm.name}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, name: e.target.value }))
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={editForm.description}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, description: e.target.value }))
            }
            margin="normal"
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateGroup}
            variant="contained"
            disabled={updateGroupMutation.isLoading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this group? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteGroup}
            color="error"
            variant="contained"
            disabled={deleteGroupMutation.isLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
      >
        <DialogTitle>Invite Friends to Group</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={filteredFriends}
            getOptionLabel={(option) => option.username}
            value={selectedFriend}
            onChange={(event, newValue) => setSelectedFriend(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Friends"
                margin="normal"
                fullWidth
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            )}
            renderOption={(props, option) => (
              <ListItem {...props}>
                <ListItemAvatar>
                  <Avatar src={option.profilePicture} alt={option.username} />
                </ListItemAvatar>
                <ListItemText primary={option.username} />
              </ListItem>
            )}
            loading={friendsLoading}
            loadingText="Loading friends..."
            noOptionsText="No friends found"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInviteFriend}
            variant="contained"
            disabled={!selectedFriend || inviteMemberMutation.isLoading}
          >
            Invite
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Group;
