import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VideoLibrary as VideoLibraryIcon,
} from "@mui/icons-material";
import { posts, groups, users } from "../services/api";
import { useAuth } from "../context/AuthContext";
import FriendsList from "../components/FriendsList";
import { Link } from "react-router-dom";
import PostMenu from "../components/PostMenu";
import CommentMenu from "../components/CommentMenu";

const Home = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [error, setError] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [editPostDialogOpen, setEditPostDialogOpen] = useState(false);
  const [editCommentDialogOpen, setEditCommentDialogOpen] = useState(false);
  const [deletePostDialogOpen, setDeletePostDialogOpen] = useState(false);
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editCommentContent, setEditCommentContent] = useState("");
  const [optimisticLikes, setOptimisticLikes] = useState({});
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => posts.getAll(),
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => groups.getAll(),
  });


  const createPostMutation = useMutation({
    mutationFn: (formData) => posts.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      setNewPost("");
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setVideoPreview(null);
      setSelectedGroup("");
      setError("");
    },
    onError: (error) => {
      setError(error.response?.data?.message || "Failed to create post");
    },
  });

  const likePostMutation = useMutation({
    mutationFn: ({ postId, isLiked }) =>
      isLiked ? posts.unlike(postId) : posts.like(postId),
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);

      queryClient.setQueryData(["posts"], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: {
            ...oldData.data,
            data: oldData.data.data.map((p) => {
              if (p._id === postId) {
                const newLikes = isLiked
                  ? p.likes.filter((id) => id !== user?._id)
                  : [...p.likes, user?._id];
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
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.addComment(postId, content),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries(["posts"]);
      setCommentTexts((prev) => ({ ...prev, [variables.postId]: "" }));
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.update(postId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      setEditPostDialogOpen(false);
      setEditingPost(null);
      setEditPostContent("");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => posts.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      setDeletePostDialogOpen(false);
      setEditingPost(null);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, content }) =>
      posts.updateComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      setEditCommentDialogOpen(false);
      setEditingComment(null);
      setEditCommentContent("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ postId, commentId }) =>
      posts.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(["posts"]);
      setDeleteCommentDialogOpen(false);
      setEditingComment(null);
    },
  });

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
    if (selectedGroup) {
      formData.append('group', selectedGroup);
    }
    createPostMutation.mutate(formData);
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

  const handleImageClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleVideoClick = (event) => {
    document.getElementById('video-upload').click();
  };

  const handleImageMenuClose = () => {
    setAnchorEl(null);
  };

  const handleImageUpload = () => {
    document.getElementById("image-upload").click();
    handleImageMenuClose();
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    handleImageMenuClose();
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroup(groupId);
    setGroupDialogOpen(false);
  };

  const handleLike = (postId) => {
    const post = postsData?.data?.data.find((p) => p._id === postId);
    if (!post || !user) return;
    const isLiked = post.likes.includes(user._id);
    likePostMutation.mutate({ postId, isLiked });
  };

  const handleCommentClick = (postId) => {
    setOpenCommentBoxId(openCommentBoxId === postId ? null : postId);
  };

  const handleCommentSubmit = (postId) => {
    if (!commentTexts[postId]?.trim()) return;
    addCommentMutation.mutate({ postId, content: commentTexts[postId] });
  };

  useEffect(() => {
    if (editPostDialogOpen && editingPost) {
      setEditPostContent(editingPost.content || "");
    }
  }, [editPostDialogOpen, editingPost]);

  if (postsLoading || groupsLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const groupsList = Array.isArray(groupsData?.data?.data)
    ? groupsData.data.data
    : [];
  const postsList = Array.isArray(postsData?.data?.data)
    ? postsData.data.data
    : [];

  return (
    <Box sx={{ bgcolor: "#f5f6fa", minHeight: "100vh", py: 4 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1000, mx: "auto", px: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 4,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          {/* Feed */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 500, mx: "auto" }}>
            <Paper
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
              }}
            >
              <Box component="form" onSubmit={handlePostSubmit}>
                {error && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  sx={{ mb: 1, bgcolor: "#fff", borderRadius: 1, fontSize: 15 }}
                  inputProps={{ style: { fontSize: 15 } }}
                />
                {imagePreview && (
                  <Box sx={{ position: "relative", mb: 1 }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "220px",
                        borderRadius: "6px",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        bgcolor: "rgba(0, 0, 0, 0.5)",
                        "&:hover": { bgcolor: "rgba(0, 0, 0, 0.7)" },
                      }}
                    >
                      <CloseIcon sx={{ color: "white", fontSize: 18 }} />
                    </IconButton>
                  </Box>
                )}
                {videoPreview && (
                  <Box sx={{ position: "relative", mb: 1 }}>
                    <video
                      src={videoPreview}
                      controls
                      style={{ maxWidth: "100%", maxHeight: "220px", borderRadius: "6px" }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveVideo}
                      sx={{ position: "absolute", top: 6, right: 6, bgcolor: "rgba(0, 0, 0, 0.5)", "&:hover": { bgcolor: "rgba(0, 0, 0, 0.7)" } }}
                    >
                      <CloseIcon sx={{ color: "white", fontSize: 18 }} />
                    </IconButton>
                  </Box>
                )}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 1,
                  }}
                >
                  <Box>
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                    />
                    <input
                      type="file"
                      id="video-upload"
                      accept="video/*"
                      onChange={handleVideoChange}
                      style={{ display: "none" }}
                    />
                    <IconButton onClick={() => document.getElementById('image-upload').click()} size="small">
                      <ImageIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={handleVideoClick} size="small">
                      <VideoLibraryIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={
                      createPostMutation.isLoading ||
                      (!newPost.trim() && !imageFile && !videoFile)
                    }
                    sx={{ fontSize: 15, px: 2, py: 0.5, borderRadius: 2 }}
                  >
                    Post
                  </Button>
                </Box>
              </Box>
            </Paper>
            {/* Compact feed: narrower, smaller posts, less padding, smaller font */}
            <Box sx={{ width: "100%" }}>
              {postsList.map((post) => {
                const isLikedByCurrentUser = post.likes.some(
                  (like) => like === user?._id || like?._id === user?._id
                );
                const hasCommentedByCurrentUser = post.comments.some(
                  (comment) =>
                    comment.author === user?._id ||
                    comment.author?._id === user?._id
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
                          user={user}
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
                      {/* Show group chip if post.group exists */}
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
                        onClick={() => handleCommentClick(post._id)}
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
                                  {comment.author?._id === user?._id && (
                                    <CommentMenu
                                      comment={comment}
                                      user={user}
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
            </Box>
          </Box>
          {/* Sidebar: Friend List */}
          <Box
            sx={{
              width: 240,
              minWidth: 180,
              maxWidth: 260,
              flexShrink: 0,
              ml: 2,
            }}
          >
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                bgcolor: "#fff",
                border: "1px solid #f0f2f5",
              }}
            >
              <FriendsList compact />
            </Paper>
          </Box>
        </Box>
        <Dialog
          open={deletePostDialogOpen}
          onClose={() => setDeletePostDialogOpen(false)}
        >
          <DialogTitle>Delete Post</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this post?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeletePostDialogOpen(false)}>
              Cancel
            </Button>
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
            <Typography>
              Are you sure you want to delete this comment?
            </Typography>
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
    </Box>
  );
};

export default Home;
