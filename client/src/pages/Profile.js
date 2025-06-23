import React, { useState, useEffect } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Box,
  Paper,
  Typography,
  Avatar,
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
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  Chip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  VideoLibrary as VideoLibraryIcon,
} from "@mui/icons-material";
import { users, posts } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PostMenu from "../components/PostMenu";
import CommentMenu from "../components/CommentMenu";

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    bio: "",
  });
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [newPost, setNewPost] = useState("");
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
  const navigate = useNavigate();
  const [optimisticLikes, setOptimisticLikes] = useState({});
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [error, setError] = useState("");

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: () => users.getById(id),
    enabled: !!id,
  });

  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ["userPosts", id],
    queryFn: () => users.getPosts(id),
    onSuccess: (data) => {
      // console.log("Posts data received:", data);
    },
  });

  const followMutation = useMutation({
    mutationFn: () => users.follow(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["user", id]);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => users.update(id, data),
    onSuccess: (response) => {
      // console.log("Profile updated successfully:", response);
      // console.log("Response data:", response.data);
      // console.log("Updated user data:", response.data.data);

      // Update the query cache with the new data
      queryClient.setQueryData(["user", id], response.data);

      // Invalidate the query to ensure fresh data
      queryClient.invalidateQueries(["user", id]);

      setEditDialogOpen(false);
      // Reset the form
      setEditForm({ username: "", bio: "" });
      setProfilePicFile(null);
      setProfilePicPreview("");
      setMessage("Profile updated successfully");
      setMessageType("success");
    },
    onError: (error) => {
      // console.error("Error updating profile:", error);
      // console.error("Error details:", error.response?.data);
      // console.error("Error status:", error.response?.status);
      // console.error("Error headers:", error.response?.headers);
      setMessage(error.response?.data?.error || "Error updating profile");
      setMessageType("error");
    },
  });

  const likePostMutation = useMutation({
    mutationFn: ({ postId, isLiked }) =>
      isLiked ? posts.unlike(postId) : posts.like(postId),
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["userPosts", id] });
      const previousPosts = queryClient.getQueryData(["userPosts", id]);

      queryClient.setQueryData(["userPosts", id], (oldData) => {
        if (!oldData) return oldData;
        const oldPosts = oldData?.data?.data || [];
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: oldPosts.map((p) => {
              if (p._id === postId) {
                const newLikes = isLiked
                  ? p.likes.filter((like) => like !== currentUser?._id)
                  : [...p.likes, currentUser?._id];
                return { ...p, likes: newLikes };
              }
              return p;
            }),
          },
        };
      });

      return { previousPosts };
    },
    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["userPosts", id], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userPosts", id] });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: () => users.sendFriendRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["user", id]);
      setMessage("Friend request sent successfully");
      setMessageType("success");
    },
    onError: (error) => {
      // console.error("Error sending friend request:", error);
      const errorMessage =
        error.response?.data?.error || "Error sending friend request";
      setMessage(errorMessage);
      setMessageType("error");

      // If the error is that users are already friends, update the UI state
      if (errorMessage === "Users are already friends") {
        queryClient.invalidateQueries(["user", id]);
      }
    },
  });

  const cancelFriendRequestMutation = useMutation({
    mutationFn: () => users.cancelFriendRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["user", id]);
      setMessage("Friend request cancelled successfully");
      setMessageType("success");
    },
    onError: (error) => {
      // console.error("Error cancelling friend request:", error);
      setMessage(
        error.response?.data?.error || "Error cancelling friend request"
      );
      setMessageType("error");
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: () => users.removeFriend(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["user", id]);
      setMessage("Friend removed successfully");
      setMessageType("success");
    },
    onError: (error) => {
      // console.error("Error removing friend:", error);
      setMessage(error.response?.data?.error || "Error removing friend");
      setMessageType("error");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.addComment(postId, content),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries(["userPosts", id]);
      setCommentTexts((prev) => ({ ...prev, [variables.postId]: "" }));
    },
  });

  const createPostMutation = useMutation({
    mutationFn: (formData) => posts.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts", id]);
      setNewPost("");
      setImageFile(null);
      setImagePreview(null);
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.update(postId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts", id]);
      setEditPostDialogOpen(false);
      setEditingPost(null);
      setEditPostContent("");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => posts.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts", id]);
      setDeletePostDialogOpen(false);
      setEditingPost(null);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, content }) =>
      posts.updateComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts", id]);
      setEditCommentDialogOpen(false);
      setEditingComment(null);
      setEditCommentContent("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ postId, commentId }) =>
      posts.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts", id]);
      setDeleteCommentDialogOpen(false);
      setEditingComment(null);
    },
  });

  const handleEditProfile = () => {
    if (profileData?.data) {
      setEditForm({
        username: profileData.data.username,
        bio: profileData.data.bio || "",
      });
      setProfilePicPreview(profileData.data.profilePicture || "");
      setProfilePicFile(null);
      setEditDialogOpen(true);
    }
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();

      // Add bio if it exists
      if (editForm.bio) {
        formData.append("bio", editForm.bio);
      }

      // Add profile picture if it exists
      if (profilePicFile) {
        formData.append("profilePicture", profilePicFile);
      }

      // console.log("FormData contents:");
      // for (let [key, value] of formData.entries()) {
      //   console.log(`${key}:`, value);
      // }

      // console.log("Submitting request with data:", formData);

      const response = await updateProfileMutation.mutateAsync(formData);
      // console.log("Profile updated successfully:", response);
      // console.log("Response data:", response);
      // console.log("Updated user data:", response.data);

      // Update the query cache with the new data
      queryClient.setQueryData(["user", id], response.data);

      // Invalidate the query to ensure fresh data
      queryClient.invalidateQueries(["user", id]);

      setEditDialogOpen(false);
      // Reset the form
      setEditForm({ username: "", bio: "" });
      setProfilePicFile(null);
      setProfilePicPreview("");
      setMessage("Profile updated successfully");
      setMessageType("success");
    } catch (error) {
      // console.error("Error updating profile:", error);
      // console.error("Error details:", error.response?.data);
      // console.error("Error status:", error.response?.status);
      // console.error("Error headers:", error.response?.headers);
      setMessage(error.response?.data?.error || "Error updating profile");
      setMessageType("error");
    }
  };

  const handleLike = (postId) => {
    const postsList = userPosts?.data?.data || [];
    const post = postsList.find((p) => p._id === postId);
    if (!post || !currentUser) return;
    const isLiked = post.likes.includes(currentUser._id);
    likePostMutation.mutate({ postId, isLiked });
  };

  const handleCommentSubmit = (postId) => {
    if (!commentTexts[postId]?.trim()) return;
    addCommentMutation.mutate({ postId, content: commentTexts[postId] });
  };

  const handlePostSubmit = async (e) => {
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

  useEffect(() => {
    if (editPostDialogOpen && editingPost) {
      setEditPostContent(editingPost.content || "");
    }
  }, [editPostDialogOpen, editingPost]);

  // Redirect if no user ID
  if (!id) {
    return <Navigate to="/" replace />;
  }

  if (profileLoading || postsLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (profileError) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography color="error">Error loading profile</Typography>
        </Paper>
      </Container>
    );
  }

  if (!profileData?.data?.data) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography>Profile not found</Typography>
        </Paper>
      </Container>
    );
  }

  const isOwnProfile = currentUser?._id === id;
  const isFollowing = profileData.data.data.followers?.includes(
    currentUser?._id
  );
  const isFriend =
    Array.isArray(profileData.data.data.friends) &&
    profileData.data.data.friends.some(
      (friend) => friend._id === currentUser?._id
    );
  const hasPendingRequest = profileData.data.data.friendRequests?.some(
    (request) =>
      request.from === currentUser?._id && request.status === "pending"
  );
  const hasReceivedRequest = profileData.data.data.friendRequests?.some(
    (request) => request.to === currentUser?._id && request.status === "pending"
  );

  // Ensure postsList is always an array
  const postsList = Array.isArray(userPosts?.data?.data)
    ? userPosts.data.data
    : Array.isArray(userPosts?.data)
    ? userPosts.data
    : [];

  // console.log("Processed postsList:", postsList);
  // console.log("Friend request status:", {
  //   isOwnProfile,
  //   isFriend,
  //   hasPendingRequest,
  //   hasReceivedRequest,
  //   friendRequests: profileData.data.friendRequests,
  //   currentUserId: currentUser?._id,
  //   profileId: id,
  //   friends: profileData.data.friends,
  // });

  // Helper to check if a file is an image
  const isImageFile = (filename) => {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename);
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Avatar
            src={
              profileData?.data?.data?.profilePicture
                ? `http://localhost:5000${
                    profileData.data.data.profilePicture
                  }?t=${Date.now()}`
                : `http://localhost:5000/default-profile.png?t=${Date.now()}`
            }
            alt={profileData?.data?.data?.username}
            sx={{ width: 120, height: 120, mb: 2 }}
            onError={(e) => {
              // console.error("Error loading profile picture:", e);
              // console.log("Failed to load image:", e.target.src);
              // console.log("Profile data:", profileData);
              e.target.src = `http://localhost:5000/default-profile.png?t=${Date.now()}`;
            }}
            onLoad={(e) => {
              // console.log("Profile picture loaded successfully:", e.target.src);
              // console.log("Profile data:", profileData);
            }}
          />
          <Box sx={{ flexGrow: 1, ml: 3 }}>
            <Typography variant="h4" gutterBottom>
              {profileData?.data?.data?.username}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {profileData?.data?.data?.bio || "No bio yet"}
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Typography variant="body2">
                <strong>{profileData.data.data.friends?.length || 0}</strong>{" "}
                friends
              </Typography>
              <Typography variant="body2">
                <strong>{profileData.data.data.followers?.length || 0}</strong>{" "}
                followers
              </Typography>
              <Typography variant="body2">
                <strong>{profileData.data.data.following?.length || 0}</strong>{" "}
                following
              </Typography>
            </Box>
          </Box>
          {isOwnProfile ? (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditProfile}
              sx={{
                borderRadius: "20px",
                textTransform: "none",
                fontWeight: 500,
                px: 3,
                color: "#ffb6d5",
                borderColor: "#ffb6d5",
                "&:hover": {
                  backgroundColor: "#ffd1ea",
                  borderColor: "#ffb6d5",
                },
              }}
            >
              Edit Profile
            </Button>
          ) : (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  navigate("/chat", {
                    state: {
                      userId: profileData.data.data._id,
                      username: profileData.data.data.username,
                      profilePicture: profileData.data.data.profilePicture,
                    },
                  });
                }}
                sx={{
                  borderRadius: "20px",
                  textTransform: "none",
                  fontWeight: 500,
                  px: 3,
                  backgroundColor: "#ffb6d5",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#ffd1ea" },
                }}
              >
                Send a Message
              </Button>
              {isFriend ? (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  disabled
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  Friends
                </Button>
              ) : hasPendingRequest ? (
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => cancelFriendRequestMutation.mutate()}
                  disabled={cancelFriendRequestMutation.isLoading}
                  color="error"
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  Cancel Request
                </Button>
              ) : hasReceivedRequest ? (
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    /* TODO: Implement accept/reject friend request */
                  }}
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 3,
                    color: "#ffb6d5",
                    borderColor: "#ffb6d5",
                    "&:hover": {
                      backgroundColor: "#ffd1ea",
                      borderColor: "#ffb6d5",
                    },
                  }}
                >
                  Respond to Request
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => sendFriendRequestMutation.mutate()}
                  disabled={sendFriendRequestMutation.isLoading}
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 3,
                    backgroundColor: "#ffb6d5",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#ffd1ea" },
                  }}
                >
                  Add Friend
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Posts" />
        <Tab label="About" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {isOwnProfile && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box component="form" onSubmit={handlePostSubmit}>
                {error && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button
                      component="span"
                      variant="outlined"
                      startIcon={<ImageIcon />}
                    >
                      Add Image
                    </Button>
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    style={{ display: "none" }}
                    id="video-upload"
                  />
                  <label htmlFor="video-upload">
                    <Button
                      component="span"
                      variant="outlined"
                      startIcon={<VideoLibraryIcon />}
                    >
                      Add Video
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
          ) : postsList.length === 0 ? (
            <Alert severity="info">
              {isOwnProfile
                ? "You haven't posted anything yet. Share your first post!"
                : "This user hasn't posted anything yet."}
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {postsList.map((post) => {
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
                  <Grid columns={12} key={post._id}>
                    <Card sx={{ mb: 3 }}>
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 2 }}
                        >
                          <Avatar
                            src={
                              post.author?.profilePicture
                                ? `http://localhost:5000${post.author.profilePicture}`
                                : "/default-profile.png"
                            }
                            alt={post.author?.username}
                            component={Link}
                            to={`/profile/${post.author?._id}`}
                            sx={{ mr: 2 }}
                            onError={(e) => {
                              e.target.src = `http://localhost:5000/default-profile.png`;
                            }}
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
                        {post.group && (
                          <Box sx={{ mb: 1 }}>
                            <Chip
                              label={`From group: ${post.group.name}`}
                              component={Link}
                              to={`/groups/${post.group._id}`}
                              clickable
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 500, fontSize: 13, mb: 0.5 }}
                            />
                          </Box>
                        )}
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
                              onError={(e) => {
                                e.target.src = `http://localhost:5000/default-post.png`;
                              }}
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
                              <ListItem
                                key={comment._id}
                                alignItems="flex-start"
                              >
                                <Avatar
                                  src={
                                    comment.author?.profilePicture
                                      ? `http://localhost:5000${comment.author.profilePicture}`
                                      : "/default-profile.png"
                                  }
                                  alt={comment.author?.username}
                                  sx={{ mr: 2 }}
                                  onError={(e) => {
                                    e.target.src = `http://localhost:5000/default-profile.png`;
                                  }}
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
                                    {comment.author?._id ===
                                      currentUser?._id && (
                                      <CommentMenu
                                        comment={comment}
                                        user={currentUser}
                                        onEdit={() => {
                                          setEditingComment({
                                            ...comment,
                                            postId: post._id,
                                          });
                                          setEditCommentContent(
                                            comment.content
                                          );
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
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            About {profileData?.data?.data?.username}
          </Typography>
          <Typography variant="body1" paragraph>
            {profileData?.data?.data?.bio || "No bio available"}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Member Since
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(
                profileData?.data?.data?.createdAt
              ).toLocaleDateString()}
            </Typography>
          </Box>
        </Paper>
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Avatar
              src={profilePicPreview}
              sx={{ width: 80, height: 80, mb: 2 }}
            />
            <Button variant="outlined" component="label">
              Change Picture
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleProfilePicChange}
              />
            </Button>
          </Box>
          <TextField
            margin="normal"
            fullWidth
            label="Bio"
            multiline
            rows={3}
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateProfile} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Post Dialog */}
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

      {/* Delete Post Confirmation Dialog */}
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

      {/* Edit Comment Dialog */}
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

      {/* Delete Comment Confirmation Dialog */}
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
    </Container>
  );
};

export default Profile;
