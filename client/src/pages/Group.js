import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import PostMenu from "../components/PostMenu";
import CommentMenu from "../components/CommentMenu";

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
  const [editPostDialogOpen, setEditPostDialogOpen] = useState(false);
  const [editCommentDialogOpen, setEditCommentDialogOpen] = useState(false);
  const [deletePostDialogOpen, setDeletePostDialogOpen] = useState(false);
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editCommentContent, setEditCommentContent] = useState("");
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [userToAdd, setUserToAdd] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [optimisticLikes, setOptimisticLikes] = useState({});
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});

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
    queryFn: () => {
      console.log("Fetching group posts for group:", id);
      return posts.getAll({ group: id });
    },
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
      setOptimisticLikes({});
    },
    onError: () => {
      setOptimisticLikes({});
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

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.update(postId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries(["groupPosts", id]);
      setEditPostDialogOpen(false);
      setEditingPost(null);
      setEditPostContent("");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => posts.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(["groupPosts", id]);
      setDeletePostDialogOpen(false);
      setEditingPost(null);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, content }) =>
      posts.updateComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(["groupPosts", id]);
      setEditCommentDialogOpen(false);
      setEditingComment(null);
      setEditCommentContent("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ postId, commentId }) =>
      posts.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(["groupPosts", id]);
      setDeleteCommentDialogOpen(false);
      setEditingComment(null);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => groups.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => groups.addMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setAddMemberDialogOpen(false);
      setUserToAdd(null);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.addComment(postId, content),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["groupPosts", id]);
      setCommentTexts((prev) => ({ ...prev, [variables.postId]: "" }));
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
    setOptimisticLikes((prev) => {
      const post = groupPostsList.find((p) => p._id === postId);
      if (!post) return prev;
      const liked =
        post.likes.includes(currentUser?._id) ||
        (prev[postId] && prev[postId].liked);
      return {
        ...prev,
        [postId]: { liked: !liked },
      };
    });
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

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUploadCoverImage = () => {
    if (!coverImageFile) return;
    const formData = new FormData();
    formData.append("coverImage", coverImageFile);
    updateGroupMutation.mutate(formData, {
      onSuccess: () => {
        setCoverImageFile(null);
        setCoverImagePreview(null);
      },
    });
  };

  const handleCommentSubmit = (postId) => {
    const content = commentTexts[postId]?.trim();
    if (!content) return;
    addCommentMutation.mutate({ postId, content });
  };

  const group = groupData?.data?.data;
  const filteredFriends =
    friendsData?.data?.data?.filter((friend) => {
      const isNotMember =
        !group || !group.members?.some((member) => member._id === friend._id);
      const matchesSearch = friend.username
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return isNotMember && matchesSearch;
    }) || [];

  const isAdmin = groupData?.data?.data?.admin?._id === currentUser?._id;
  const isMember = groupData?.data?.data?.members?.some(
    (member) => member._id === currentUser?._id
  );

  const groupPostsList = groupPosts?.data?.data || [];

  // Helper to get profile picture or fallback
  const getProfilePicture = (user) =>
    user?.profilePicture
      ? `http://localhost:5000${user.profilePicture}`
      : `http://localhost:5000/uploads/default-profile.png`;

  useEffect(() => {
    if (editPostDialogOpen && editingPost) {
      setEditPostContent(editingPost.content || "");
    }
  }, [editPostDialogOpen, editingPost]);

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

  if (postsError) {
    console.error("Error loading group posts:", postsError);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Cover Image Section */}
      <Box sx={{ position: "relative", mb: 3 }}>
        <img
          src={
            group.coverImage
              ? `http://localhost:5000${group.coverImage}`
              : "http://localhost:5000/uploads/default_cover.png"
          }
          alt="Group Cover"
          style={{
            width: "100%",
            height: 240,
            objectFit: "cover",
            borderRadius: 12,
          }}
        />
        {isAdmin && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="group-cover-image-upload"
              type="file"
              onChange={handleCoverImageChange}
            />
            <label htmlFor="group-cover-image-upload">
              <Button variant="contained" component="span" size="small">
                Change Cover
              </Button>
            </label>
            {coverImagePreview && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleUploadCoverImage}
                sx={{ ml: 1 }}
              >
                Save
              </Button>
            )}
          </Box>
        )}
        {coverImagePreview && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              bgcolor: "background.paper",
              p: 1,
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            <Typography variant="caption">Preview:</Typography>
            <img
              src={coverImagePreview}
              alt="Preview"
              style={{
                width: 120,
                height: 60,
                objectFit: "cover",
                borderRadius: 8,
                marginTop: 4,
              }}
            />
          </Box>
        )}
      </Box>
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
                sx={{
                  backgroundColor: "#ffb6d5",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#ffd1ea" },
                }}
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
            sx={{
              backgroundColor: "#ffb6d5",
              color: "#fff",
              "&:hover": { backgroundColor: "#ffd1ea" },
            }}
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
          ) : groupPostsList.length === 0 ? (
            <Alert severity="info">
              No posts yet. Be the first to share something!
            </Alert>
          ) : (
            <Grid columns={12}>
              {groupPostsList.map((post) => (
                <Grid columns={12} key={post._id}>
                  <Card
                    sx={{ mb: 2, boxShadow: 3, "&:hover": { boxShadow: 6 } }}
                    className="card"
                  >
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <Avatar
                          src={getProfilePicture(post.author)}
                          alt={post.author?.username}
                          sx={{ mr: 2 }}
                        />
                        <Box>
                          <Typography variant="subtitle1">
                            <Link
                              to={`/profile/${post.author?._id}`}
                              style={{
                                textDecoration: "none",
                                color: "inherit",
                                fontWeight: 500,
                              }}
                            >
                              {post.author?.username}
                            </Link>
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
                            src={`http://localhost:5000${post.media}`}
                            alt="Post media"
                            style={{ maxWidth: "100%", borderRadius: 8 }}
                          />
                        </Box>
                      )}
                      {(currentUser?._id === post.author?._id ||
                        currentUser?.role === "admin" ||
                        isAdmin) && (
                        <PostMenu
                          onEdit={() => {
                            setEditingPost(post);
                            setEditPostContent(post.content);
                            setEditPostDialogOpen(true);
                          }}
                          onDelete={() => {
                            setEditingPost(post);
                            setDeletePostDialogOpen(true);
                          }}
                        />
                      )}
                      {post.comments && post.comments.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Comments
                          </Typography>
                          {post.comments.map((comment) => (
                            <Box
                              key={comment._id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Avatar
                                src={getProfilePicture(comment.author)}
                                alt={comment.author?.username}
                                sx={{ mr: 2 }}
                              />
                              <Box>
                                <Typography variant="body2">
                                  <Link
                                    to={`/profile/${comment.author?._id}`}
                                    style={{
                                      textDecoration: "none",
                                      color: "inherit",
                                      fontWeight: 500,
                                    }}
                                  >
                                    <strong>{comment.author?.username}</strong>
                                  </Link>{" "}
                                  {comment.content}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {new Date(comment.createdAt).toLocaleString()}
                                </Typography>
                              </Box>
                              {(currentUser?._id === comment.author?._id ||
                                currentUser?.role === "admin") && (
                                <CommentMenu
                                  onEdit={() => {
                                    setEditingComment({
                                      ...comment,
                                      postId: post._id,
                                    });
                                    setEditCommentContent(comment.content);
                                    setEditCommentDialogOpen(true);
                                  }}
                                  onDelete={() => {
                                    setEditingComment({
                                      ...comment,
                                      postId: post._id,
                                    });
                                    setDeleteCommentDialogOpen(true);
                                  }}
                                />
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                    <Divider />
                    <CardActions>
                      <IconButton
                        onClick={() => handleLike(post._id)}
                        size="small"
                        className={`like-btn${
                          (
                            optimisticLikes[post._id]?.liked !== undefined
                              ? optimisticLikes[post._id].liked
                              : post.likes?.includes(currentUser?._id)
                          )
                            ? " animated"
                            : ""
                        }`}
                      >
                        {(
                          optimisticLikes[post._id]?.liked !== undefined
                            ? optimisticLikes[post._id].liked
                            : post.likes?.includes(currentUser?._id)
                        ) ? (
                          <ThumbUpIcon
                            fontSize="small"
                            sx={{ color: "#ffb6d5" }}
                          />
                        ) : (
                          <ThumbUpOutlinedIcon
                            fontSize="small"
                            sx={{ color: "inherit" }}
                          />
                        )}
                      </IconButton>
                      <Typography variant="body2" color="text.secondary">
                        {post.likes?.length || 0} likes
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setOpenCommentBoxId(
                            openCommentBoxId === post._id ? null : post._id
                          )
                        }
                      >
                        <CommentIcon
                          fontSize="small"
                          sx={{
                            color:
                              openCommentBoxId === post._id
                                ? "#ffb6d5"
                                : "inherit",
                          }}
                        />
                      </IconButton>
                      <Typography variant="body2" color="text.secondary">
                        {post.comments?.length || 0} comments
                      </Typography>
                      <IconButton>
                        <ShareIcon />
                      </IconButton>
                    </CardActions>
                    {openCommentBoxId === post._id && (
                      <Box sx={{ mt: 0.5, mx: 2, mb: 2 }}>
                        <TextField
                          fullWidth
                          placeholder="Write a comment..."
                          value={commentTexts[post._id] || ""}
                          onChange={(e) =>
                            setCommentTexts({
                              ...commentTexts,
                              [post._id]: e.target.value,
                            })
                          }
                          sx={{
                            mb: 0.5,
                            bgcolor: "#f7f8fa",
                            borderRadius: 1,
                            fontSize: 13,
                          }}
                          inputProps={{ style: { fontSize: 13 } }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleCommentSubmit(post._id)}
                          disabled={
                            !commentTexts[post._id]?.trim() ||
                            addCommentMutation.isLoading
                          }
                          sx={{
                            fontSize: 13,
                            px: 2,
                            py: 0.5,
                            borderRadius: 2,
                            backgroundColor: "#ffb6d5",
                            color: "#fff",
                            "&:hover": { backgroundColor: "#ffd1ea" },
                          }}
                        >
                          Comment
                        </Button>
                      </Box>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setAddMemberDialogOpen(true)}
              sx={{
                mb: 2,
                backgroundColor: "#ffb6d5",
                color: "#fff",
                "&:hover": { backgroundColor: "#ffd1ea" },
              }}
            >
              Add Member
            </Button>
          )}
          {group.members?.length === 0 ? (
            <Alert severity="info">No members in this group yet.</Alert>
          ) : (
            <List>
              {group.members?.map((member) => (
                <ListItem
                  key={member._id}
                  secondaryAction={
                    member._id === group.admin?._id ? (
                      <Chip label="Admin" color="primary" size="small" />
                    ) : isAdmin ? (
                      <Button
                        color="error"
                        size="small"
                        onClick={() => {
                          setMemberToRemove(member);
                          setRemoveMemberDialogOpen(true);
                        }}
                      >
                        Remove
                      </Button>
                    ) : null
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      src={getProfilePicture(member)}
                      alt={member.username}
                    />
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
                  <Avatar
                    src={getProfilePicture(option)}
                    alt={option.username}
                  />
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

      <Dialog
        open={editPostDialogOpen}
        onClose={() => setEditPostDialogOpen(false)}
      >
        <DialogTitle>Edit Post</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editPostContent}
            onChange={(e) => setEditPostContent(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPostDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              updatePostMutation.mutate({
                postId: editingPost._id,
                content: editPostContent,
              })
            }
            disabled={updatePostMutation.isLoading || !editPostContent.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deletePostDialogOpen}
        onClose={() => setDeletePostDialogOpen(false)}
      >
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this post?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePostDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deletePostMutation.mutate(editingPost._id)}
            disabled={deletePostMutation.isLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editCommentDialogOpen}
        onClose={() => setEditCommentDialogOpen(false)}
      >
        <DialogTitle>Edit Comment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={editCommentContent}
            onChange={(e) => setEditCommentContent(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCommentDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() =>
              updateCommentMutation.mutate({
                postId: editingComment.postId,
                commentId: editingComment._id,
                content: editCommentContent,
              })
            }
            disabled={
              updateCommentMutation.isLoading || !editCommentContent.trim()
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteCommentDialogOpen}
        onClose={() => setDeleteCommentDialogOpen(false)}
      >
        <DialogTitle>Delete Comment</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this comment?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCommentDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              deleteCommentMutation.mutate({
                postId: editingComment.postId,
                commentId: editingComment._id,
              })
            }
            disabled={deleteCommentMutation.isLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={removeMemberDialogOpen}
        onClose={() => setRemoveMemberDialogOpen(false)}
      >
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {memberToRemove?.username} from the
            group?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveMemberDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() =>
              removeMemberMutation.mutate({
                groupId: id,
                userId: memberToRemove._id,
              })
            }
            disabled={removeMemberMutation.isLoading}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addMemberDialogOpen}
        onClose={() => setAddMemberDialogOpen(false)}
      >
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={filteredFriends}
            getOptionLabel={(option) => option.username}
            value={userToAdd}
            onChange={(_, value) => setUserToAdd(value)}
            renderInput={(params) => (
              <TextField {...params} label="Select Friend" />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() =>
              userToAdd &&
              addMemberMutation.mutate({ groupId: id, userId: userToAdd._id })
            }
            disabled={addMemberMutation.isLoading || !userToAdd}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Group;
