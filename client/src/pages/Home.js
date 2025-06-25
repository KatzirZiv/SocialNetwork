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
import StatisticsGraphs from '../components/StatisticsGraphs';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

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
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    group: '',
    author: '',
    mediaType: '',
    startDate: '',
    endDate: '',
    sort: 'desc',
  });
  const [pendingFilters, setPendingFilters] = useState(filters);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", filters],
    queryFn: () => posts.getAll({
      group: filters.group,
      author: filters.author,
      mediaType: filters.mediaType,
      startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
      endDate: filters.endDate
        ? (() => {
            const d = new Date(filters.endDate);
            d.setHours(23, 59, 59, 999);
            return d.toISOString();
          })()
        : undefined,
      sort: filters.sort,
    }),
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

  useEffect(() => {
    if (imagePreview) {
      const canvas = document.getElementById('image-preview-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        img.onload = function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = imagePreview;
      }
    }
  }, [imagePreview]);

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
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 0, md: '24px' },
        alignItems: 'flex-start',
        width: '100%',
        minWidth: 0,
        minHeight: '100vh',
        boxSizing: 'border-box',
        px: 0,
        m: 0,
      }}
    >
      {/* Left: Statistics */}
      <Box
        sx={{
          flex: '0 0 260px',
          maxWidth: 260,
          width: { xs: '100%', md: 260 },
          display: { xs: 'none', md: 'block' },
          p: 0,
          m: 0,
        }}
      >
        <Box sx={{ m: 0, p: 0 }}>
          <StatisticsGraphs />
        </Box>
      </Box>
      {/* Center: Posts */}
      <Box
        sx={{
          flex: 1,
          minWidth: 500,
          maxWidth: { md: 'calc(100vw - 520px)' },
          width: '100%',
          margin: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Filter Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <button
            className="project-ui-btn contained"
            style={{
              background: '#ffb6d5',
              color: '#fff',
              border: '1.5px solid #ffb6d5',
              boxShadow: '0 1px 4px rgba(255,182,213,0.08)',
              padding: '8px 28px',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '1rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
            }}
            onClick={() => { setPendingFilters(filters); setFilterDialogOpen(true); }}
          >
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: 0.5 }}>Filter</span>
          </button>
        </Box>
        {filterDialogOpen && (
          <div className="custom-modal-overlay">
            <div className="custom-modal project-ui-modal">
              <h2 style={{
                margin: 0,
                marginBottom: 18,
                fontWeight: 700,
                fontSize: 24,
                color: '#ff4fa3',
                fontFamily: 'Inter, Roboto, Arial, sans-serif',
                letterSpacing: 0.5
              }}>Filter Posts</h2>
              <label>
                Group
                <select value={pendingFilters.group} onChange={e => setPendingFilters(f => ({ ...f, group: e.target.value }))}>
                  <option value="">All</option>
                  {groupsList.map(group => (
                    <option key={group._id} value={group._id}>{group.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Author ID
                <input
                  type="text"
                  value={pendingFilters.author}
                  onChange={e => setPendingFilters(f => ({ ...f, author: e.target.value }))}
                  placeholder="Enter user ID or leave blank for all"
                />
              </label>
              <label>
                Media Type
                <select value={pendingFilters.mediaType} onChange={e => setPendingFilters(f => ({ ...f, mediaType: e.target.value }))}>
                  <option value="">All</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="text">Text Only</option>
                </select>
              </label>
              <label>
                Start Date
                <input
                  type="date"
                  value={pendingFilters.startDate}
                  onChange={e => setPendingFilters(f => ({ ...f, startDate: e.target.value }))}
                />
              </label>
              <label>
                End Date
                <input
                  type="date"
                  value={pendingFilters.endDate}
                  onChange={e => setPendingFilters(f => ({ ...f, endDate: e.target.value }))}
                />
              </label>
              <label>
                Sort
                <select value={pendingFilters.sort} onChange={e => setPendingFilters(f => ({ ...f, sort: e.target.value }))}>
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button className="project-ui-btn outlined" onClick={() => setPendingFilters({ group: '', author: '', mediaType: '', startDate: '', endDate: '', sort: 'desc' })}>
                  Reset Filters
                </button>
                <button className="project-ui-btn outlined" onClick={() => setFilterDialogOpen(false)}>Cancel</button>
                <button className="project-ui-btn contained" onClick={() => { setFilters(pendingFilters); setFilterDialogOpen(false); }}>Apply</button>
              </div>
            </div>
            <style>{`
              .custom-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.18);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
              }
              .custom-modal.project-ui-modal {
                background: #fff;
                padding: 36px 32px 28px 32px;
                border-radius: 18px;
                min-width: 340px;
                box-shadow: 0 2px 16px rgba(255,182,213,0.18), 0 2px 8px rgba(0,0,0,0.04);
                display: flex;
                flex-direction: column;
                gap: 16px;
                font-family: 'Inter', 'Roboto', Arial, sans-serif;
              }
              .custom-modal label {
                display: flex;
                flex-direction: column;
                font-weight: 600;
                color: #222;
                margin-bottom: 2px;
                font-size: 15px;
                gap: 4px;
              }
              .custom-modal input, .custom-modal select {
                margin-top: 2px;
                padding: 8px 10px;
                border-radius: 10px;
                border: 1px solid #ffd1ea;
                font-size: 1rem;
                background: #f7f9fb;
                color: #222;
                font-family: inherit;
                transition: border 0.2s;
              }
              .custom-modal input:focus, .custom-modal select:focus {
                outline: none;
                border: 1.5px solid #ffb6d5;
                background: #fff;
              }
              .project-ui-btn {
                padding: 8px 28px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 1rem;
                font-family: inherit;
                border: none;
                cursor: pointer;
                transition: background 0.18s, color 0.18s, box-shadow 0.18s;
                box-shadow: 0 1px 4px rgba(255,182,213,0.08);
              }
              .project-ui-btn.contained {
                background: #ffb6d5;
                color: #fff;
                border: 1.5px solid #ffb6d5;
              }
              .project-ui-btn.contained:hover {
                background: #ffd1ea;
                color: #ff4fa3;
                border: 1.5px solid #ffb6d5;
              }
              .project-ui-btn.outlined {
                background: #fff;
                color: #ffb6d5;
                border: 1.5px solid #ffb6d5;
              }
              .project-ui-btn.outlined:hover {
                background: #ffd1ea;
                color: #ff4fa3;
                border: 1.5px solid #ffb6d5;
              }
              .custom-filter-btn {
                padding: 7px 22px;
                border-radius: 20px;
                border: 1.5px solid #ffb6d5;
                background: #fff;
                color: #ffb6d5;
                font-weight: 700;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.18s, color 0.18s, box-shadow 0.18s;
                box-shadow: 0 1px 4px rgba(255,182,213,0.08);
              }
              .custom-filter-btn:hover {
                background: #ffd1ea;
                color: #ff4fa3;
                border: 1.5px solid #ffb6d5;
              }
            `}</style>
          </div>
        )}
        {user && (
          <Paper
            elevation={2}
            sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Avatar
                src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "/default-profile.png"}
                sx={{ mr: 2, width: 48, height: 48 }}
                onError={e => { e.target.src = "/default-profile.png"; }}
              />
              <TextField
                fullWidth
                variant="outlined"
                placeholder={`What's on your mind, ${user.username}?`}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                multiline
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 30,
                    bgcolor: "#f0f2f5",
                    "& fieldset": {
                      border: "none",
                    },
                  },
                }}
              />
            </Box>
            {(imagePreview || videoPreview) && (
              <Box sx={{ position: "relative", mb: 2 }}>
                <IconButton
                  onClick={imagePreview ? handleRemoveImage : handleRemoveVideo}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                  }}
                >
                  <CloseIcon />
                </IconButton>
                {imagePreview && (
                  <canvas
                    id="image-preview-canvas"
                    width={400}
                    height={225}
                    style={{ width: '100%', borderRadius: '12px', display: 'block' }}
                  />
                )}
                {videoPreview && <video src={videoPreview} controls style={{ width: "100%", borderRadius: "12px" }} />}
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                  <ImageIcon fontSize="small" /> Photo
                </IconButton>
                <IconButton onClick={handleVideoClick} size="small">
                  <VideoLibraryIcon fontSize="small" /> Video
                </IconButton>
              </Box>
              <Button
                type="submit"
                variant="contained"
                onClick={handlePostSubmit}
                disabled={
                  createPostMutation.isLoading ||
                  (!newPost.trim() && !imageFile && !videoFile)
                }
                sx={{ borderRadius: 2 }}
              >
                Post
              </Button>
            </Box>
          </Paper>
        )}
        {postsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
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
                <Card
                  key={post._id}
                  sx={{
                    mb: 3,
                    width: '100%',
                    borderRadius: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    margin: '0 0 24px 0',
                  }}
                >
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
                          sx={{ textDecoration: "none", color: "inherit", fontWeight: 'bold', fontSize: '1rem' }}
                        >
                          {post.author?.username}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
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
                      <Box sx={{ mt: 2, borderRadius: '12px' }}>
                        <video
                          src={`http://localhost:5000${post.media}`}
                          controls
                          style={{ width: "100%", borderRadius: "12px", display: 'block' }}
                        />
                      </Box>
                    ) : post.media && post.mediaType === 'image' ? (
                      <Box sx={{ mt: 2, borderRadius: '12px' }}>
                        <img
                          src={`http://localhost:5000${post.media}`}
                          alt="Post media"
                          style={{ width: "100%", borderRadius: "12px", display: 'block' }}
                        />
                      </Box>
                    ) : null}
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ justifyContent: "space-around" }}>
                    <Button
                      sx={{
                        color: isLikedByCurrentUser ? "#ec4899" : "inherit",
                        fontWeight: 'bold'
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
                        fontWeight: 'bold'
                      }}
                      startIcon={<CommentIcon />}
                      onClick={() => handleCommentClick(post._id)}
                    >
                      Comment ({post.comments.length})
                    </Button>
                    <Button
                      startIcon={<ShareIcon />}
                      sx={{ color: "inherit", fontWeight: 'bold' }}
                    >
                      Share
                    </Button>
                  </CardActions>
                  {openCommentBoxId === post._id && (
                    <Box sx={{ p: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "/default-profile.png"}
                        sx={{ mr: 2, width: 32, height: 32 }}
                        onError={e => { e.target.src = "/default-profile.png"; }}
                      />
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
                         sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 20,
                          },
                        }}
                      />
                      </Box>
                      <Box sx={{ display: "flex", gap: 1, mt: 1, justifyContent: 'flex-end' }}>
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
                          <ListItem key={comment._id} alignItems="flex-start" sx={{ pl: 0 }}>
                            <Avatar
                              src={comment.author?.profilePicture ? `http://localhost:5000${comment.author.profilePicture}` : "/default-profile.png"}
                              alt={comment.author?.username}
                              sx={{ mr: 2, width: 32, height: 32 }}
                              onError={e => { e.target.src = "/default-profile.png"; }}
                            />
                            <Box sx={{ p: 1, borderRadius: 2, flexGrow: 1 }}>
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
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {comment.author?.username}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="textSecondary"
                                  sx={{ fontSize: '0.75rem' }}
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
                              <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
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
        )}
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
      </Box>
      {/* Right: Friends */}
      <Box
        sx={{
          flex: '0 0 260px',
          maxWidth: 260,
          width: { xs: '100%', md: 260 },
          display: { xs: 'none', md: 'block' },
          p: 0,
          m: 0,
        }}
      >
        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            bgcolor: "#fff",
            border: "1px solid #f0f2f5",
            m: 0,
          }}
        >
          <FriendsList compact />
        </Paper>
      </Box>
    </Box>
  );
};

export default Home;