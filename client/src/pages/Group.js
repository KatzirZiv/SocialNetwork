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
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
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
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [error, setError] = useState("");
  const [transferAdminDialogOpen, setTransferAdminDialogOpen] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const { data: myJoinRequestData, refetch: refetchMyJoinRequest } = useQuery({
    queryKey: ['myJoinRequest', id, currentUser?._id],
    queryFn: () => groups.getMyJoinRequest(id),
    enabled: !!currentUser?._id,
  });
  const myJoinRequest = myJoinRequestData?.data?.data;

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
      refetchMyJoinRequest();
      queryClient.invalidateQueries(["group", id]);
    },
    onSettled: () => {
      refetchMyJoinRequest();
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

  const transferAdminMutation = useMutation({
    mutationFn: ({ groupId, newAdminId }) => groups.transferAdmin(groupId, newAdminId),
    onSuccess: () => {
      setTransferAdminDialogOpen(false);
      setSelectedNewAdmin(null);
      leaveGroupMutation.mutate();
    },
  });

  const cancelJoinRequestMutation = useMutation({
    mutationFn: () => groups.cancelJoinRequest(id),
    onSuccess: () => {
      refetchMyJoinRequest();
      queryClient.invalidateQueries(["group", id]);
    },
    onSettled: () => {
      refetchMyJoinRequest();
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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !imageFile && !videoFile) return;
    setError("");
    let mediaType = null;
    let file = null;
    if (imageFile) {
      file = imageFile;
      mediaType = 'image';
    } else if (videoFile) {
      file = videoFile;
      mediaType = 'video';
    }
    const formData = new FormData();
    formData.append('content', newPost);
    if (file) {
      formData.append('media', file);
      formData.append('mediaType', mediaType);
    }
    if (id) {
      formData.append('group', id);
    }
    createPostMutation.mutate(formData, {
      onError: (error) => {
        setError(error.response?.data?.message || "Failed to create post");
      },
      onSuccess: () => {
        setVideoFile(null);
        setVideoPreview(null);
        setError("");
      }
    });
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

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
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

  useEffect(() => {
    if (isAdmin && window.history.state && window.history.state.usr && window.history.state.usr.openTransferAdmin) {
      setTransferAdminDialogOpen(true);
      // Remove the flag so it doesn't reopen on refresh
      window.history.replaceState({ ...window.history.state, usr: { ...window.history.state.usr, openTransferAdmin: false } }, '');
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && group?._id) {
      groups.getJoinRequests(group._id).then(res => {
        setJoinRequests(res.data.data || []);
      });
    }
  }, [isAdmin, group?._id]);

  const handleJoinGroup = () => {
    joinGroupMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (group.privacy === 'private') {
          refetchMyJoinRequest();
          queryClient.invalidateQueries(["group", id]);
        }
      },
      onError: (error) => {
        if (error.message === 'Join request already sent') {
          refetchMyJoinRequest();
          queryClient.invalidateQueries(["group", id]);
        } else {
          setError(error.message || 'Failed to join group');
        }
      }
    });
  };

  const handleAcceptJoinRequest = (requestId) => {
    groups.acceptJoinRequest(group._id, requestId).then(() => {
      setJoinRequests((prev) => prev.filter(r => r._id !== requestId));
      queryClient.invalidateQueries(["group", id]);
    });
  };

  const handleDeclineJoinRequest = (requestId) => {
    groups.declineJoinRequest(group._id, requestId).then(() => {
      setJoinRequests((prev) => prev.filter(r => r._id !== requestId));
    });
  };

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

  const canViewGroup = group && (group.privacy === 'public' || isMember || isAdmin);

  if (!canViewGroup) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <Typography variant="h5" gutterBottom>This group is private</Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            You must be a member to view the group details.
          </Typography>
          {myJoinRequest?.status === 'pending' ? (
            <Button
              variant="outlined"
              color="error"
              onClick={() => cancelJoinRequestMutation.mutate()}
              disabled={cancelJoinRequestMutation.isLoading}
              startIcon={<CancelIcon />}
              sx={{ mt: 2, backgroundColor: '#ffd1ea', color: '#ffb6d5', '&:hover': { backgroundColor: '#ffe6f2' } }}
            >
              Cancel Request
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={joinGroupMutation.isLoading}
              sx={{ mt: 2, backgroundColor: '#ffb6d5', color: '#fff', '&:hover': { backgroundColor: '#ffd1ea' } }}
              onClick={handleJoinGroup}
            >
              Request to Join
            </Button>
          )}
        </Paper>
      </Container>
    );
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
                onClick={() => setTransferAdminDialogOpen(true)}
                disabled={leaveGroupMutation.isLoading}
              >
                Leave Group
              </Button>
            ) : (
              group.privacy === 'private' ? (
                myJoinRequest?.status === 'pending' ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => cancelJoinRequestMutation.mutate()}
                    disabled={cancelJoinRequestMutation.isLoading}
                    startIcon={<CancelIcon />}
                    sx={{ backgroundColor: '#ffd1ea', color: '#ffb6d5', '&:hover': { backgroundColor: '#ffe6f2' } }}
                  >
                    Cancel Request
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    disabled={joinGroupMutation.isLoading}
                    sx={{ backgroundColor: '#ffb6d5', color: '#fff', '&:hover': { backgroundColor: '#ffd1ea' } }}
                    onClick={handleJoinGroup}
                  >
                    Request to Join
                  </Button>
                )
              ) : (
                <Button
                  variant="contained"
                  onClick={handleJoinGroup}
                  disabled={joinGroupMutation.isLoading}
                  sx={{ backgroundColor: '#ffb6d5', color: '#fff', '&:hover': { backgroundColor: '#ffd1ea' } }}
                >
                  Join Group
                </Button>
              )
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
                {error && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Share something with the group..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="group-post-image-upload"
                    type="file"
                    onChange={handleImageChange}
                  />
                  <label htmlFor="group-post-image-upload">
                    <Button variant="outlined" component="span">
                      Upload Image
                    </Button>
                  </label>
                  <input
                    accept="video/*"
                    style={{ display: "none" }}
                    id="group-post-video-upload"
                    type="file"
                    onChange={handleVideoChange}
                  />
                  <label htmlFor="group-post-video-upload">
                    <Button variant="outlined" component="span">
                      Upload Video
                    </Button>
                  </label>
                  {imagePreview && (
                    <Box sx={{ position: "relative", display: "inline-block" }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ maxHeight: "100px", borderRadius: "4px" }}
                      />
                      <IconButton
                        size="small"
                        onClick={handleRemoveImage}
                        sx={{ position: "absolute", top: -8, right: -8, bgcolor: "background.paper" }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  {videoPreview && (
                    <Box sx={{ position: "relative", display: "inline-block" }}>
                      <video
                        src={videoPreview}
                        controls
                        style={{ maxHeight: "100px", borderRadius: "4px" }}
                      />
                      <IconButton
                        size="small"
                        onClick={handleRemoveVideo}
                        sx={{ position: "absolute", top: -8, right: -8, bgcolor: "background.paper" }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={(!newPost.trim() && !imageFile && !videoFile) || createPostMutation.isLoading}
                >
                  {createPostMutation.isLoading ? "Posting..." : "Post"}
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
              {groupPostsList.map((post) => {
                const isLikedByCurrentUser = post.likes.some(
                  (like) =>
                    like === currentUser?._id || like?._id === currentUser?._id
                );
                const hasCommentedByCurrentUser = post.comments.some(
                  (comment) =>
                    comment.author === currentUser?._id ||
                    comment.author?._id === currentUser?._id
                );
                return (
                  <Card key={post._id} sx={{ mb: 3 }}>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <Avatar
                          src={post.author?.profilePicture ? `http://localhost:5000${post.author.profilePicture}` : "/default-profile.png"}
                          alt={post.author?.username}
                          component={Link}
                          to={`/profile/${post.author?._id}`}
                          sx={{ mr: 2 }}
                          onError={e => { e.target.src = "/default-profile.png"; }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="h6"
                            component={Link}
                            to={`/profile/${post.author?._id}`}
                            sx={{ textDecoration: "none", color: "inherit" }}
                          >
                            {post.author?.username}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(post.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                        <PostMenu
                          post={post}
                          user={currentUser}
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
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{ mt: 1, whiteSpace: "pre-wrap" }}
                      >
                        {post.content}
                      </Typography>
                      {post.media && post.mediaType === 'video' ? (
                        <Box sx={{ mt: 2 }}>
                          <video
                            src={`http://localhost:5000${post.media}`}
                            controls
                            style={{ maxWidth: "100%", borderRadius: "8px" }}
                          />
                        </Box>
                      ) : post.media && post.mediaType === 'image' ? (
                        <Box sx={{ mt: 2 }}>
                          <img
                            src={`http://localhost:5000${post.media}`}
                            alt="Post media"
                            style={{ maxWidth: "100%", borderRadius: "8px" }}
                          />
                        </Box>
                      ) : null}
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ justifyContent: "space-around" }}>
                      <Button
                        sx={{
                          color: isLikedByCurrentUser ? "#ec4899" : "inherit",
                        }}
                        startIcon={
                          isLikedByCurrentUser ? (
                            <FavoriteIcon />
                          ) : (
                            <FavoriteBorderIcon />
                          )
                        }
                        onClick={() => handleLike(post._id)}
                      >
                        Like ({post.likes.length})
                      </Button>
                      <Button
                        sx={{
                          color: hasCommentedByCurrentUser
                            ? "#ec4899"
                            : "inherit",
                        }}
                        startIcon={<CommentIcon />}
                        onClick={() =>
                          setOpenCommentBoxId(
                            openCommentBoxId === post._id ? null : post._id
                          )
                        }
                      >
                        Comment ({post.comments.length})
                      </Button>
                      <Button
                        startIcon={<ShareIcon />}
                        sx={{ color: "inherit" }}
                      >
                        Share
                      </Button>
                    </CardActions>
                    {openCommentBoxId === post._id && (
                      <Box sx={{ p: 2 }}>
                        <Divider sx={{ mb: 2 }} />
                        <TextField
                          fullWidth
                          variant="outlined"
                          placeholder="Write a comment..."
                          value={commentTexts[post._id] || ""}
                          onChange={(e) =>
                            setCommentTexts({
                              ...commentTexts,
                              [post._id]: e.target.value,
                            })
                          }
                        />
                        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleCommentSubmit(post._id)}
                            disabled={addCommentMutation.isLoading}
                          >
                            Post Comment
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setOpenCommentBoxId(null)}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    )}
                    {post.comments.length > 0 && (
                      <Box sx={{ p: 2 }}>
                        <List>
                          {post.comments.map((comment) => (
                            <ListItem key={comment._id} alignItems="flex-start">
                              <Avatar
                                src={comment.author?.profilePicture ? `http://localhost:5000${comment.author.profilePicture}` : "/default-profile.png"}
                                alt={comment.author?.username}
                                sx={{ mr: 2 }}
                                onError={e => { e.target.src = "/default-profile.png"; }}
                              />
                              <Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    component={Link}
                                    to={`/profile/${comment.author?._id}`}
                                    sx={{
                                      textDecoration: "none",
                                      color: "inherit",
                                    }}
                                  >
                                    {comment.author?.username}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                  >
                                    {new Date(comment.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                  {comment.author?._id === currentUser?._id && (
                                    <CommentMenu
                                      comment={comment}
                                      user={currentUser}
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
                                <Typography variant="body1">
                                  {comment.content}
                                </Typography>
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Card>
                );
              })}
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
            <>
              {isAdmin && joinRequests.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, background: '#fff7fa' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Pending Join Requests</Typography>
                  <List>
                    {joinRequests.map((request) => (
                      <ListItem key={request._id} secondaryAction={
                        <>
                          <Button size="small" color="primary" onClick={() => handleAcceptJoinRequest(request._id)} sx={{ mr: 1 }}>Accept</Button>
                          <Button size="small" color="error" onClick={() => handleDeclineJoinRequest(request._id)}>Decline</Button>
                        </>
                      }>
                        <ListItemAvatar>
                          <Avatar src={request.user?.profilePicture ? `http://localhost:5000${request.user.profilePicture}` : '/default-profile.png'} />
                        </ListItemAvatar>
                        <ListItemText primary={request.user?.username} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
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
                        src={member.profilePicture ? `http://localhost:5000${member.profilePicture}` : "/default-profile.png"}
                        alt={member.username}
                        onError={e => { e.target.src = "/default-profile.png"; }}
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
            </>
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
                    src={option.profilePicture ? `http://localhost:5000${option.profilePicture}` : "/default-profile.png"}
                    alt={option.username}
                    onError={e => { e.target.src = "/default-profile.png"; }}
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

      <Dialog
        open={transferAdminDialogOpen}
        onClose={() => setTransferAdminDialogOpen(false)}
      >
        <DialogTitle>Transfer Admin Before Leaving</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You must transfer admin rights to another member before leaving the group. Please select the new admin:
          </Typography>
          <List>
            {group.members?.filter(m => m._id !== group.admin?._id).map(member => (
              <ListItem
                button
                key={member._id}
                selected={selectedNewAdmin === member._id}
                onClick={() => setSelectedNewAdmin(member._id)}
              >
                <ListItemAvatar>
                  <Avatar
                    src={member.profilePicture ? `http://localhost:5000${member.profilePicture}` : "/default-profile.png"}
                    alt={member.username}
                    onError={e => { e.target.src = "/default-profile.png"; }}
                  />
                </ListItemAvatar>
                <ListItemText primary={member.username} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferAdminDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => transferAdminMutation.mutate({ groupId: id, newAdminId: selectedNewAdmin })}
            variant="contained"
            color="primary"
            disabled={!selectedNewAdmin || transferAdminMutation.isLoading}
          >
            Transfer & Leave
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Group;
