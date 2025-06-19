import React, { useState } from "react";
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
} from "@mui/material";
import {
  Edit as EditIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { users, posts } from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  const [editPostContent, setEditPostContent] = useState('');
  const [editCommentContent, setEditCommentContent] = useState('');
  const navigate = useNavigate();

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
    mutationFn: (postId) => posts.like(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts", id]);
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
      queryClient.invalidateQueries(['userPosts', id]);
      setEditPostDialogOpen(false);
      setEditingPost(null);
      setEditPostContent('');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => posts.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(['userPosts', id]);
      setDeletePostDialogOpen(false);
      setEditingPost(null);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, content }) => posts.updateComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['userPosts', id]);
      setEditCommentDialogOpen(false);
      setEditingComment(null);
      setEditCommentContent('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ postId, commentId }) => posts.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['userPosts', id]);
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
    likePostMutation.mutate(postId);
  };

  const handleCommentSubmit = (postId) => {
    if (!commentTexts[postId]?.trim()) return;
    addCommentMutation.mutate({ postId, content: commentTexts[postId] });
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !imageFile) return;

    const formData = new FormData();
    if (newPost.trim()) {
      formData.append("content", newPost.trim());
    }
    if (imageFile) {
      formData.append("media", imageFile);
    }

    try {
      await createPostMutation.mutateAsync(formData);
    } catch (error) {
      // console.error("Error creating post:", error);
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
  const isFollowing = profileData.data.data.followers?.includes(currentUser?._id);
  const isFriend = Array.isArray(profileData.data.data.friends) && profileData.data.data.friends.some(friend => friend._id === currentUser?._id);
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
                <strong>{profileData.data.data.friends?.length || 0}</strong> friends
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
              }}
            >
              Edit Profile
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  navigate('/chat', {
                    state: {
                      userId: profileData.data.data._id,
                      username: profileData.data.data.username,
                      profilePicture: profileData.data.data.profilePicture
                    }
                  });
                }}
                sx={{
                  borderRadius: "20px",
                  textTransform: "none",
                  fontWeight: 500,
                  px: 3,
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
                  color="primary"
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 3,
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
                  color="primary"
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 3,
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
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
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
                      sx={{ mr: 2 }}
                    >
                      Add Image
                    </Button>
                  </label>
                  {imagePreview && (
                    <Box sx={{ position: "relative", display: "inline-block" }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          maxHeight: "100px",
                          borderRadius: "4px",
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          bgcolor: "background.paper",
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={
                    (!newPost.trim() && !imageFile) ||
                    createPostMutation.isLoading
                  }
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
                // console.log("Rendering post:", post);
                return (
                  <Grid columns={12} key={post._id}>
                    <Card sx={{ mb: 2, boxShadow: 3, '&:hover': { boxShadow: 6 } }}>
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 2 }}
                        >
                          <Avatar
                            src={
                              post.author?.profilePicture
                                ? `http://localhost:5000${post.author.profilePicture}`
                                : `http://localhost:5000/default-profile.png`
                            }
                            alt={post.author?.username}
                            sx={{ mr: 2 }}
                            onError={(e) => {
                              e.target.src = `http://localhost:5000/default-profile.png`;
                            }}
                          />
                          <Box>
                            <Typography variant="subtitle1">
                              <Link to={`/profile/${post.author?._id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
                                {post.author?.username}
                              </Link>
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(post.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                          {(currentUser?._id === post.author?._id || currentUser?.role === 'admin') && (
                            <>
                              <IconButton size="small" onClick={() => { setEditingPost(post); setEditPostContent(post.content); setEditPostDialogOpen(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => { setEditingPost(post); setDeletePostDialogOpen(true); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Box>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {post.content}
                        </Typography>
                        {post.media && (
                          <Box
                            component="img"
                            src={`http://localhost:5000${post.media}`}
                            alt="Post media"
                            sx={{
                              width: "100%",
                              maxHeight: 400,
                              objectFit: "cover",
                              borderRadius: 1,
                            }}
                            onError={(e) => {
                              // console.error("Error loading image:", e);
                              // console.log("Failed image path:", e.target.src);
                              e.target.src = `http://localhost:5000/default-post.png`;
                            }}
                            onLoad={(e) => {
                              // console.log(
                              //   "Successfully loaded image:",
                              //   e.target.src
                              // );
                            }}
                          />
                        )}
                        {post.comments?.length > 0 && (
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
                                  src={
                                    comment.author?.profilePicture
                                      ? `http://localhost:5000${
                                          comment.author.profilePicture
                                        }?t=${Date.now()}`
                                      : `http://localhost:5000/default-profile.png?t=${Date.now()}`
                                  }
                                  alt={comment.author?.username}
                                  sx={{ mr: 1, width: 24, height: 24 }}
                                  onError={(e) => {
                                    e.target.src = `http://localhost:5000/default-profile.png?t=${Date.now()}`;
                                  }}
                                />
                                <Box>
                                  <Typography variant="body2">
                                    <Link to={`/profile/${comment.author?._id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
                                      <strong>{comment.author?.username}</strong>
                                    </Link> {comment.content}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {new Date(
                                      comment.createdAt
                                    ).toLocaleString()}
                                  </Typography>
                                </Box>
                                {(currentUser?._id === comment.author?._id || currentUser?.role === 'admin') && (
                                  <>
                                    <IconButton size="small" onClick={() => { setEditingComment({ ...comment, postId: post._id }); setEditCommentContent(comment.content); setEditCommentDialogOpen(true); }}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => { setEditingComment({ ...comment, postId: post._id }); setDeleteCommentDialogOpen(true); }}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
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
                          {post.likes?.length || 0}
                        </Typography>
                        <IconButton>
                          <CommentIcon />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">
                          {post.comments?.length || 0}
                        </Typography>
                        <IconButton>
                          <ShareIcon />
                        </IconButton>
                      </CardActions>
                      <Box sx={{ p: 2 }}>
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
                          sx={{ mb: 1 }}
                        />
                        <Button
                          variant="contained"
                          onClick={() => handleCommentSubmit(post._id)}
                          disabled={
                            !commentTexts[post._id]?.trim() ||
                            addCommentMutation.isLoading
                          }
                        >
                          Comment
                        </Button>
                      </Box>
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
      <Dialog open={editPostDialogOpen} onClose={() => setEditPostDialogOpen(false)}>
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
            onClick={() => updatePostMutation.mutate({ postId: editingPost._id, content: editPostContent })}
            disabled={updatePostMutation.isLoading || !editPostContent.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Post Confirmation Dialog */}
      <Dialog open={deletePostDialogOpen} onClose={() => setDeletePostDialogOpen(false)}>
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
      <Dialog open={editCommentDialogOpen} onClose={() => setEditCommentDialogOpen(false)}>
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
          <Button onClick={() => setEditCommentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => updateCommentMutation.mutate({ postId: editingComment.postId, commentId: editingComment._id, content: editCommentContent })}
            disabled={updateCommentMutation.isLoading || !editCommentContent.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Comment Confirmation Dialog */}
      <Dialog open={deleteCommentDialogOpen} onClose={() => setDeleteCommentDialogOpen(false)}>
        <DialogTitle>Delete Comment</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this comment?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCommentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteCommentMutation.mutate({ postId: editingComment.postId, commentId: editingComment._id })}
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
