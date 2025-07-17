import React, { useState, useEffect } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Grid,
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
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { users, posts } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import ConfirmDialog from "../components/ConfirmDialog";
import EditDialog from "../components/EditDialog";
import useCommentInput from "../hooks/useCommentInput";
import usePostMutations from "../hooks/usePostMutations";
import UserAvatar from "../components/UserAvatar";
import PostForm from "../components/PostForm";
import useDialogState from "../hooks/useDialogState";

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
  const [commentTexts, handleCommentChange, setCommentTexts] =
    useCommentInput();
  const [activeTab, setActiveTab] = useState(0);
  const [newPost, setNewPost] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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

  // Dialog states for editing/deleting posts/comments
  const { open, openDialog, closeDialog } = useDialogState([
    "editPost",
    "editComment",
    "deletePost",
    "deleteComment",
  ]);

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

  // Integrate usePostMutations for post/comment actions
  const {
    createPost,
    updatePost,
    deletePost,
    likePost,
    addComment,
    updateComment,
    deleteComment,
  } = usePostMutations({
    queryClient,
    user: currentUser,
    postsQueryKey: ["userPosts", id],
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
    mutationFn: () => users.removeFriend(currentUser._id, id),
    onSuccess: () => {
      queryClient.invalidateQueries(["user", id]);
      setMessage("Friend removed successfully");
      setMessageType("success");
    },
    onError: (error) => {
      setMessage(error.response?.data?.error || "Error removing friend");
      setMessageType("error");
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
    likePost.mutate({ postId, isLiked });
  };

  const handleCommentSubmit = (postId) => {
    if (!commentTexts[postId]?.trim()) return;
    addComment.mutate(
      { postId, content: commentTexts[postId] },
      {
        onSuccess: () => setCommentTexts(""),
      }
    );
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !imageFile && !videoFile) return;
    setError("");
    let mediaType = null;
    let file = null;
    if (imageFile) {
      file = imageFile;
      mediaType = "image";
    } else if (videoFile) {
      file = videoFile;
      mediaType = "video";
    }
    const formData = new FormData();
    formData.append("content", newPost);
    if (file) {
      formData.append("media", file);
      formData.append("mediaType", mediaType);
    }
    createPost.mutate(formData, {
      onError: (error) => {
        setError(error.response?.data?.message || "Failed to create post");
      },
      onSuccess: () => {
        setNewPost("");
        setImageFile(null);
        setImagePreview(null);
        setVideoFile(null);
        setVideoPreview(null);
        setError("");
      },
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
    if (open.editPost && editingPost) {
      setEditPostContent(editingPost.content || "");
    }
  }, [open.editPost, editingPost]);

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
          <UserAvatar
            user={profileData?.data?.data}
            size={120}
            sx={{ width: 120, height: 120, mb: 2 }}
          />
          <Box sx={{ flexGrow: 1, ml: 3 }}>
            <Typography variant="h4" gutterBottom>
              {profileData?.data?.data?.username}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {profileData?.data?.data?.bio || "No bio yet"}
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              {profileData.data.data.friends?.length > 0 && (
                <Typography variant="body2">
                  <strong>{profileData.data.data.friends.length}</strong>{" "}
                  friends
                </Typography>
              )}
              {profileData.data.data.followers?.length > 0 && (
                <Typography variant="body2">
                  <strong>{profileData.data.data.followers.length}</strong>{" "}
                  followers
                </Typography>
              )}
              {profileData.data.data.following?.length > 0 && (
                <Typography variant="body2">
                  <strong>{profileData.data.data.following.length}</strong>{" "}
                  following
                </Typography>
              )}
            </Box>
          </Box>
          {isOwnProfile ? (
            <Box sx={{ display: "flex", gap: 2 }}>
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
              <Button
                variant="outlined"
                onClick={() => navigate("/settings")}
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
                Settings
              </Button>
            </Box>
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
                  startIcon={<PersonRemoveIcon />}
                  color="error"
                  onClick={() => removeFriendMutation.mutate()}
                  disabled={removeFriendMutation.isLoading}
                  sx={{
                    borderRadius: "20px",
                    textTransform: "none",
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  Remove Friend
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
            <PostForm
              user={currentUser}
              onSubmit={(formData, { reset }) => {
                createPost.mutate(formData, {
                  onSuccess: reset,
                  onError: (error) =>
                    setError(
                      error.response?.data?.message || "Failed to create post"
                    ),
                });
              }}
              loading={createPost.isLoading}
              error={error}
            />
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
                    <PostCard
                      post={post}
                      user={currentUser}
                      isLikedByCurrentUser={isLikedByCurrentUser}
                      hasCommentedByCurrentUser={hasCommentedByCurrentUser}
                      commentTexts={commentTexts}
                      openCommentBoxId={openCommentBoxId}
                      onLike={() => handleLike(post._id)}
                      onCommentClick={() =>
                        setOpenCommentBoxId(
                          openCommentBoxId === post._id ? null : post._id
                        )
                      }
                      onCommentChange={(e) => handleCommentChange(post._id, e)}
                      onCommentSubmit={() => handleCommentSubmit(post._id)}
                      onEdit={() => {
                        setEditingPost(post);
                        setEditPostContent(post.content);
                        openDialog("editPost");
                      }}
                      onDelete={() => {
                        setEditingPost(post);
                        openDialog("deletePost");
                      }}
                      onOpenCommentBox={() => setOpenCommentBoxId(post._id)}
                      onCloseCommentBox={() => setOpenCommentBoxId(null)}
                      addCommentLoading={addComment.isLoading}
                      setEditingComment={setEditingComment}
                      setEditCommentContent={setEditCommentContent}
                      setEditCommentDialogOpen={() => openDialog("editComment")}
                      setDeleteCommentDialogOpen={() =>
                        openDialog("deleteComment")
                      }
                    />
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
            <UserAvatar
              user={profileData?.data?.data}
              size={80}
              sx={{ width: 80, height: 80, mb: 2 }}
              src={profilePicPreview}
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

      {/* Dialogs for editing/deleting posts and comments */}
      <EditDialog
        open={open.editPost}
        title="Edit Post"
        value={editPostContent}
        onChange={(e) => setEditPostContent(e.target.value)}
        onClose={() => closeDialog("editPost")}
        onSave={() =>
          updatePost.mutate(
            { postId: editingPost._id, content: editPostContent },
            {
              onSuccess: () => {
                closeDialog("editPost");
                setEditingPost(null);
                setEditPostContent("");
              },
            }
          )
        }
        loading={updatePost.isLoading}
      />
      <EditDialog
        open={open.editComment}
        title="Edit Comment"
        value={editCommentContent}
        onChange={(e) => setEditCommentContent(e.target.value)}
        onClose={() => closeDialog("editComment")}
        onSave={() =>
          updateComment.mutate(
            {
              postId: editingComment.postId,
              commentId: editingComment._id,
              content: editCommentContent,
            },
            {
              onSuccess: () => {
                closeDialog("editComment");
                setEditingComment(null);
                setEditCommentContent("");
              },
            }
          )
        }
        loading={updateComment.isLoading}
      />
      <ConfirmDialog
        open={open.deletePost}
        title="Delete Post"
        content="Are you sure you want to delete this post?"
        onClose={() => closeDialog("deletePost")}
        onConfirm={() =>
          deletePost.mutate(editingPost._id, {
            onSuccess: () => {
              closeDialog("deletePost");
              setEditingPost(null);
            },
          })
        }
        loading={deletePost.isLoading}
        confirmText="Delete"
      />
      <ConfirmDialog
        open={open.deleteComment}
        title="Delete Comment"
        content="Are you sure you want to delete this comment?"
        onClose={() => closeDialog("deleteComment")}
        onConfirm={() =>
          deleteComment.mutate(
            { postId: editingComment.postId, commentId: editingComment._id },
            {
              onSuccess: () => {
                closeDialog("deleteComment");
                setEditingComment(null);
              },
            }
          )
        }
        loading={deleteComment.isLoading}
        confirmText="Delete"
      />
    </Container>
  );
};

export default Profile;
