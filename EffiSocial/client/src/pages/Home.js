import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { posts, groups, users } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FriendsList from '../components/FriendsList';
import { Link } from 'react-router-dom';
import PostMenu from '../components/PostMenu';
import CommentMenu from '../components/CommentMenu';

const Home = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [error, setError] = useState('');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [editPostDialogOpen, setEditPostDialogOpen] = useState(false);
  const [editCommentDialogOpen, setEditCommentDialogOpen] = useState(false);
  const [deletePostDialogOpen, setDeletePostDialogOpen] = useState(false);
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editCommentContent, setEditCommentContent] = useState('');
  const [optimisticLikes, setOptimisticLikes] = useState({});
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => posts.getAll(),
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groups.getAll(),
  });
  console.log('DEBUG groupsData:', groupsData);

  const createPostMutation = useMutation({
    mutationFn: (postData) => posts.create(postData),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setNewPost('');
      setImageFile(null);
      setImagePreview(null);
      setSelectedGroup('');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to create post');
    },
  });

  const likePostMutation = useMutation({
    mutationFn: (postId) => posts.like(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setOptimisticLikes({});
    },
    onError: () => {
      setOptimisticLikes({});
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.addComment(postId, content),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries(['posts']);
      setCommentTexts((prev) => ({ ...prev, [variables.postId]: '' }));
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, content }) => posts.update(postId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setEditPostDialogOpen(false);
      setEditingPost(null);
      setEditPostContent('');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId) => posts.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setDeletePostDialogOpen(false);
      setEditingPost(null);
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, content }) => posts.updateComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setEditCommentDialogOpen(false);
      setEditingComment(null);
      setEditCommentContent('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ postId, commentId }) => posts.deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['posts']);
      setDeleteCommentDialogOpen(false);
      setEditingComment(null);
    },
  });

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!newPost.trim() && !imageFile) return;

    const formData = new FormData();
    formData.append('content', newPost);
    if (imageFile) {
      formData.append('media', imageFile);
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

  const handleImageClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleImageMenuClose = () => {
    setAnchorEl(null);
  };

  const handleImageUpload = () => {
    document.getElementById('image-upload').click();
    handleImageMenuClose();
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    handleImageMenuClose();
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroup(groupId);
    setGroupDialogOpen(false);
  };

  const handleLike = (postId) => {
    setOptimisticLikes((prev) => {
      const post = postsList.find((p) => p._id === postId);
      if (!post) return prev;
      const liked = post.likes.includes(user?._id) || (prev[postId] && prev[postId].liked);
      return {
        ...prev,
        [postId]: { liked: !liked }
      };
    });
    likePostMutation.mutate(postId);
  };

  const handleCommentSubmit = (postId) => {
    if (!commentTexts[postId]?.trim()) return;
    addCommentMutation.mutate({ postId, content: commentTexts[postId] });
  };

  useEffect(() => {
    if (editPostDialogOpen && editingPost) {
      setEditPostContent(editingPost.content || '');
    }
  }, [editPostDialogOpen, editingPost]);

  if (postsLoading || groupsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const groupsList = Array.isArray(groupsData?.data?.data) ? groupsData.data.data : [];
  console.log('DEBUG groupsList:', groupsList);
  const postsList = Array.isArray(postsData?.data?.data) ? postsData.data.data : [];

  return (
    <Box sx={{ bgcolor: '#f5f6fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth={false} sx={{ maxWidth: 1000, mx: 'auto', px: 2 }}>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', justifyContent: 'center' }}>
          {/* Feed */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 500, mx: 'auto' }}>
            <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, boxShadow: '0 1px 6px rgba(0,0,0,0.03)' }}>
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
                  sx={{ mb: 1, bgcolor: '#fff', borderRadius: 1, fontSize: 15 }}
                  inputProps={{ style: { fontSize: 15 } }}
                />
                {imagePreview && (
                  <Box sx={{ position: 'relative', mb: 1 }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '220px',
                        borderRadius: '6px',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveImage}
                      sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                      }}
                    >
                      <CloseIcon sx={{ color: 'white', fontSize: 18 }} />
                    </IconButton>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Box>
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                    <IconButton onClick={handleImageClick} size="small">
                      <ImageIcon fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleImageMenuClose}
                    >
                      <MenuItem onClick={handleImageUpload}>Upload Image</MenuItem>
                      {imagePreview && (
                        <MenuItem onClick={handleRemoveImage}>Remove Image</MenuItem>
                      )}
                    </Menu>
                  </Box>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={createPostMutation.isLoading || (!newPost.trim() && !imageFile)}
                    sx={{ fontSize: 15, px: 2, py: 0.5, borderRadius: 2 }}
                  >
                    Post
                  </Button>
                </Box>
              </Box>
            </Paper>
            {/* Compact feed: narrower, smaller posts, less padding, smaller font */}
            <Box sx={{ width: '100%' }}>
              {postsList.map((post, idx) => {
                const groupObj = post.group ? groupsList.find(g => g._id === post.group._id) : null;
                const isGroupAdmin = groupObj && groupObj.admin && groupObj.admin._id === user?._id;
                return (
                  <React.Fragment key={post._id}>
                    <Box
                      sx={{
                        bgcolor: '#fff',
                        borderRadius: 2,
                        px: 2,
                        py: 1.5,
                        mb: 0,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                        border: 'none',
                        minHeight: 80,
                        maxWidth: 500,
                        mx: 'auto',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Avatar
                          src={post.author?.profilePicture ? `http://localhost:5000${post.author.profilePicture}?t=${Date.now()}` : `http://localhost:5000/default-profile.png?t=${Date.now()}`}
                          alt={post.author?.username}
                          sx={{ mr: 1, width: 34, height: 34 }}
                          onError={(e) => {
                            e.target.src = `http://localhost:5000/default-profile.png?t=${Date.now()}`;
                          }}
                        />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: 15 }}>
                            <Link to={`/profile/${post.author?._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              {post.author?.username}
                            </Link>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                            {new Date(post.createdAt).toLocaleString()}
                          </Typography>
                          {post.group && (
                            <Box sx={{ mt: 0.2 }}>
                              <Chip
                                label={`Group: ${post.group?.name || 'Unknown'}`}
                                color="primary"
                                size="small"
                                sx={{ mt: 0.2, fontSize: 11, height: 20 }}
                              />
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        {(user?._id === post.author?._id || user?.role === 'admin' || isGroupAdmin) && (
                          <PostMenu
                            onEdit={() => { setEditingPost(post); setEditPostContent(post.content); setEditPostDialogOpen(true); }}
                            onDelete={() => { setEditingPost(post); setDeletePostDialogOpen(true); }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ mb: post.media ? 1.2 : 0.5, whiteSpace: 'pre-line', fontSize: 15, lineHeight: 1.5 }}>
                        {post.content}
                      </Typography>
                      {post.media && (
                        <Box
                          component="img"
                          src={`http://localhost:5000${post.media}`}
                          alt="Post media"
                          sx={{
                            width: '100%',
                            maxHeight: 220,
                            objectFit: 'cover',
                            borderRadius: 1,
                            mb: 1,
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      {post.comments && post.comments.length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ fontSize: 13, fontWeight: 500 }}>
                            Comments
                          </Typography>
                          {post.comments.map((comment) => (
                            <Box key={comment._id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Avatar
                                src={comment.author?.profilePicture ? `http://localhost:5000${comment.author.profilePicture}?t=${Date.now()}` : `http://localhost:5000/default-profile.png?t=${Date.now()}`}
                                alt={comment.author?.username}
                                sx={{ mr: 1, width: 22, height: 22 }}
                                onError={(e) => {
                                  e.target.src = `http://localhost:5000/default-profile.png?t=${Date.now()}`;
                                }}
                              />
                              <Box>
                                <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>
                                  <Link to={`/profile/${comment.author?._id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
                                    <strong>{comment.author?.username}</strong>
                                  </Link> {comment.content}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                                  {new Date(comment.createdAt).toLocaleString()}
                                </Typography>
                              </Box>
                              {(user?._id === comment.author?._id || user?.role === 'admin') && (
                                <CommentMenu
                                  onEdit={() => { setEditingComment({ ...comment, postId: post._id }); setEditCommentContent(comment.content); setEditCommentDialogOpen(true); }}
                                  onDelete={() => { setEditingComment({ ...comment, postId: post._id }); setDeleteCommentDialogOpen(true); }}
                                />
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <IconButton
                          onClick={() => handleLike(post._id)}
                          color={((optimisticLikes[post._id]?.liked !== undefined
                            ? optimisticLikes[post._id].liked
                            : post.likes?.includes(user?._id))
                            ? 'primary'
                            : 'default')}
                          size="small"
                        >
                          {(optimisticLikes[post._id]?.liked !== undefined
                            ? optimisticLikes[post._id].liked
                            : post.likes?.includes(user?._id)) ? (
                            <ThumbUpIcon fontSize="small" />
                          ) : (
                            <ThumbUpOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontSize: 13 }}>
                          {post.likes?.length || 0} likes
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setOpenCommentBoxId(openCommentBoxId === post._id ? null : post._id)}
                        >
                          <CommentIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontSize: 13 }}>
                          {post.comments?.length || 0} comments
                        </Typography>
                        <IconButton size="small">
                          <ShareIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {openCommentBoxId === post._id && (
                        <Box sx={{ mt: 0.5 }}>
                          <TextField
                            fullWidth
                            placeholder="Write a comment..."
                            value={commentTexts[post._id] || ''}
                            onChange={(e) => setCommentTexts({ ...commentTexts, [post._id]: e.target.value })}
                            sx={{ mb: 0.5, bgcolor: '#f7f8fa', borderRadius: 1, fontSize: 13 }}
                            inputProps={{ style: { fontSize: 13 } }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleCommentSubmit(post._id)}
                            disabled={!commentTexts[post._id]?.trim() || addCommentMutation.isLoading}
                            sx={{ fontSize: 13, px: 2, py: 0.5, borderRadius: 2 }}
                          >
                            Comment
                          </Button>
                        </Box>
                      )}
                    </Box>
                    {idx < postsList.length - 1 && <Divider sx={{ my: 2, mx: 'auto', maxWidth: 500 }} />}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
          {/* Sidebar: Friend List */}
          <Box sx={{ width: 240, minWidth: 180, maxWidth: 260, flexShrink: 0, ml: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', bgcolor: '#fff', border: '1px solid #f0f2f5' }}>
              <FriendsList compact />
            </Paper>
          </Box>
        </Box>
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
    </Box>
  );
};

export default Home;