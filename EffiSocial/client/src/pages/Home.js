import React, { useState } from 'react';
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

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => posts.getAll(),
    // onSuccess: (data) => {
    //   console.log('Posts updated after comment:', data);
    // },
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groups.getAll(),
  });

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
    },
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

    // console.log('Submitting post with data:', {
    //   content: newPost,
    //   group: selectedGroup,
    //   imageFile: imageFile ? imageFile.name : null,
    // });

    createPostMutation.mutate(formData, {
      onSuccess: (response) => {
        // console.log('Post created successfully:', response);
      },
      onError: (error) => {
        // console.error('Error creating post:', error);
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
    likePostMutation.mutate(postId);
  };

  const handleCommentSubmit = (postId) => {
    if (!commentTexts[postId]?.trim()) return;
    // console.log('Submitting comment:', { postId, content: commentTexts[postId] });
    addCommentMutation.mutate({ postId, content: commentTexts[postId] });
  };

  if (postsLoading || groupsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const groupsList = Array.isArray(groupsData?.data) ? groupsData.data : [];
  const postsList = Array.isArray(postsData?.data?.data) ? postsData.data.data : [];


  return (
    <Container maxWidth="lg">
      <Grid container spacing={3}>
        <Grid columns={12} md={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box component="form" onSubmit={handlePostSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setGroupDialogOpen(true)}
                  sx={{ mr: 2 }}
                >
                  {selectedGroup ? 'Change Group' : 'Choose Group'}
                </Button>
                {selectedGroup && (
                  <Typography variant="body2" color="text.secondary">
                    Group: {groupsList.find(g => g._id === selectedGroup)?.name}
                  </Typography>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="What's on your mind?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                sx={{ mb: 2 }}
              />
              {imagePreview && (
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                    }}
                  >
                    <CloseIcon sx={{ color: 'white' }} />
                  </IconButton>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <IconButton onClick={handleImageClick}>
                    <ImageIcon />
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
                  disabled={createPostMutation.isLoading || (!newPost.trim() && !imageFile)}
                >
                  Post
                </Button>
              </Box>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            {postsList.map((post) => (
              <Grid columns={12} key={post._id}>
                <Card sx={{ mb: 2, boxShadow: 3, '&:hover': { boxShadow: 6 } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        src={post.author?.profilePicture ? `http://localhost:5000${post.author.profilePicture}?t=${Date.now()}` : `http://localhost:5000/default-profile.png?t=${Date.now()}`}
                        alt={post.author?.username}
                        sx={{ mr: 2 }}
                        onError={(e) => {
                          e.target.src = `http://localhost:5000/default-profile.png?t=${Date.now()}`;
                        }}
                      />
                      <Box>
                        <Typography variant="subtitle1">
                          <Link to={`/profile/${post.author?._id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}>
                            {post.author?.username}
                          </Link>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(post.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      {(user?._id === post.author?._id || user?.role === 'admin') && (
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
                          width: '100%',
                          maxHeight: 400,
                          objectFit: 'cover',
                          borderRadius: 1,
                        }}
                        onError={(e) => {
                          console.error('Error loading image:', e);
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    {post.comments && post.comments.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Comments
                        </Typography>
                        {post.comments.map((comment) => (
                          <Box key={comment._id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar
                              src={comment.author?.profilePicture ? `http://localhost:5000${comment.author.profilePicture}?t=${Date.now()}` : `http://localhost:5000/default-profile.png?t=${Date.now()}`}
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
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.createdAt).toLocaleString()}
                              </Typography>
                            </Box>
                            {(user?._id === comment.author?._id || user?.role === 'admin') && (
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
                      color={post.likes?.includes(user?._id) ? 'primary' : 'default'}
                    >
                      {post.likes?.includes(user?._id) ? (
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
                      value={commentTexts[post._id] || ''}
                      onChange={(e) => setCommentTexts({ ...commentTexts, [post._id]: e.target.value })}
                      sx={{ mb: 1 }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleCommentSubmit(post._id)}
                      disabled={!commentTexts[post._id]?.trim() || addCommentMutation.isLoading}
                    >
                      Comment
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
        <Grid columns={12} md={4}>
          <FriendsList />
        </Grid>
      </Grid>

      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)}>
        <DialogTitle>Choose a Group</DialogTitle>
        <DialogContent>
          <List>
            {groupsList.map((group) => (
              <ListItem button key={group._id} onClick={() => handleGroupSelect(group._id)}>
                <ListItemText primary={group.name} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
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

export default Home; 