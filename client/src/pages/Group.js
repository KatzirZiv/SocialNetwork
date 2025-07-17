// Group.js - Group page for viewing, managing, and interacting with a group
// Handles group info, posts, members, join requests, admin actions, and more.

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
import PostCard from "../components/PostCard";
import ConfirmDialog from "../components/ConfirmDialog";
import EditDialog from "../components/EditDialog";
import useCommentInput from "../hooks/useCommentInput";
import usePostMutations from "../hooks/usePostMutations";
import UserAvatar from "../components/UserAvatar";
import PostForm from "../components/PostForm";
import useDialogState from "../hooks/useDialogState";
import UserList from "../components/UserList";

const Group = () => {
  // Get group ID from URL params
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  // Dialog and form state
  const { open, openDialog, closeDialog } = useDialogState([
    'editPost', 'editComment', 'deletePost', 'deleteComment'
  ]);
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
  // Media state for post/cover
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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
  // Optimistic UI state for likes
  const [optimisticLikes, setOptimisticLikes] = useState({});
  // State for open comment box and comment texts
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);
  const [commentTexts, handleCommentChange, setCommentTexts] = useCommentInput();
  // Video state for post
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  // Error and admin transfer state
  const [error, setError] = useState("");
  const [transferAdminDialogOpen, setTransferAdminDialogOpen] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  // State for join requests (admin only)
  const [joinRequests, setJoinRequests] = useState([]);

  // Query for current user's join request to this group
  const { data: myJoinRequestData, refetch: refetchMyJoinRequest } = useQuery({
    queryKey: ['myJoinRequest', id, currentUser?._id],
    queryFn: () => groups.getMyJoinRequest(id),
    enabled: !!currentUser?._id,
  });
  const myJoinRequest = myJoinRequestData?.data?.data;

  // Query for group details
  const {
    data: groupData,
    isLoading: groupLoading,
    error: groupError,
  } = useQuery({
    queryKey: ["group", id],
    queryFn: () => groups.getById(id),
  });

  // Query for posts in this group
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

  // Query for current user's friends (for inviting to group)
  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", currentUser?._id],
    queryFn: () => users.getFriends(currentUser?._id),
    enabled: !!currentUser?._id,
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
  } = usePostMutations({ queryClient, user: currentUser, postsQueryKey: ["groupPosts", id] });

  // --- Mutations for group actions ---

  // Join group (send join request or join directly)
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

  // Leave group
  const leaveGroupMutation = useMutation({
    mutationFn: () => groups.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
    },
  });

  // Update group info (admin)
  const updateGroupMutation = useMutation({
    mutationFn: (data) => groups.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setEditDialogOpen(false);
    },
  });

  // Delete group (admin)
  const deleteGroupMutation = useMutation({
    mutationFn: () => groups.delete(id),
    onSuccess: () => {
      navigate("/groups");
    },
  });

  // Invite a friend to the group (admin)
  const inviteMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => groups.invite(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setInviteDialogOpen(false);
      setSelectedFriend(null);
    },
  });

  // Remove a member from the group (admin)
  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => groups.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    },
  });

  // Add a member to the group (admin)
  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => groups.addMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["group", id]);
      setAddMemberDialogOpen(false);
      setUserToAdd(null);
    },
  });

  // Transfer admin rights (admin)
  const transferAdminMutation = useMutation({
    mutationFn: ({ groupId, newAdminId }) => groups.transferAdmin(groupId, newAdminId),
    onSuccess: () => {
      setTransferAdminDialogOpen(false);
      setSelectedNewAdmin(null);
      leaveGroupMutation.mutate();
    },
  });

  // Cancel a join request (member)
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
      }
    });
  };

  const handleLike = (postId) => {
    const groupPostsList = groupPosts?.data?.data || [];
    const post = groupPostsList.find((p) => p._id === postId);
    if (!post || !currentUser) return;
    const isLiked = post.likes.includes(currentUser._id);
    likePost.mutate({ postId, isLiked });
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
        const input = document.getElementById('group-cover-image-upload');
        if (input) input.value = '';
        setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 300);
      },
    });
  };

  const handleCommentSubmit = (postId) => {
    if (!commentTexts[postId]?.trim()) return;
    addComment.mutate({ postId, content: commentTexts[postId] }, {
      onSuccess: () => setCommentTexts("")
    });
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
    if (open.editPost && editingPost) {
      setEditPostContent(editingPost.content || "");
    }
  }, [open.editPost, editingPost]);

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
            {/* Only show Save button and preview if there is a new image selected */}
            {coverImagePreview && coverImageFile && (
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
        {/* Only show preview if there is a new image selected */}
        {coverImagePreview && coverImageFile && (
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
            <PostForm
              user={currentUser}
              onSubmit={(formData, { reset }) => {
                createPost.mutate(formData, {
                  onSuccess: reset,
                  onError: (error) => setError(error.response?.data?.message || "Failed to create post"),
                });
              }}
              loading={createPost.isLoading}
              error={error}
              groupId={id}
            />
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
                  <PostCard
                    key={post._id}
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
                    onCommentChange={e => handleCommentChange(post._id, e)}
                    onCommentSubmit={() => handleCommentSubmit(post._id)}
                    onEdit={() => {
                      setEditingPost(post);
                      setEditPostContent(post.content);
                      openDialog('editPost');
                    }}
                    onDelete={() => {
                      setEditingPost(post);
                      openDialog('deletePost');
                    }}
                    onOpenCommentBox={() => setOpenCommentBoxId(post._id)}
                    onCloseCommentBox={() => setOpenCommentBoxId(null)}
                    addCommentLoading={addComment.isLoading}
                    setEditingComment={setEditingComment}
                    setEditCommentContent={setEditCommentContent}
                    setEditCommentDialogOpen={() => openDialog('editComment')}
                    setDeleteCommentDialogOpen={() => openDialog('deleteComment')}
                  />
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
                  <UserList
                    users={joinRequests.map(r => r.user)}
                    getActions={user => (
                      <>
                        <Button size="small" color="primary" onClick={() => handleAcceptJoinRequest(joinRequests.find(r => r.user._id === user._id)._id)} sx={{ mr: 1 }}>Accept</Button>
                        <Button size="small" color="error" onClick={() => handleDeclineJoinRequest(joinRequests.find(r => r.user._id === user._id)._id)}>Decline</Button>
                      </>
                    )}
                    avatarSize={40}
                    divider={true}
                  />
                </Paper>
              )}
              <UserList
                users={group.members}
                getActions={member => (
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
                )}
                getSecondary={member => member._id === group.admin?._id ? "Group Admin" : "Member"}
                avatarSize={40}
                divider={true}
              />
            </>
          )}
        </Paper>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
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
          <UserList
            users={filteredFriends}
            loading={friendsLoading}
            emptyText="No friends found"
            onUserClick={friend => setSelectedFriend(friend)}
            selectedUserId={selectedFriend?._id}
            getSecondary={null}
            getActions={null}
            avatarSize={40}
            divider={true}
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

      {/* Dialogs for editing/deleting posts and comments */}
      <EditDialog
        open={open.editPost}
        title="Edit Post"
        value={editPostContent}
        onChange={e => setEditPostContent(e.target.value)}
        onClose={() => closeDialog('editPost')}
        onSave={() => updatePost.mutate({ postId: editingPost._id, content: editPostContent }, {
          onSuccess: () => {
            closeDialog('editPost');
            setEditingPost(null);
            setEditPostContent("");
          }
        })}
        loading={updatePost.isLoading}
      />
      <EditDialog
        open={open.editComment}
        title="Edit Comment"
        value={editCommentContent}
        onChange={e => setEditCommentContent(e.target.value)}
        onClose={() => closeDialog('editComment')}
        onSave={() => updateComment.mutate({ postId: editingComment.postId, commentId: editingComment._id, content: editCommentContent }, {
          onSuccess: () => {
            closeDialog('editComment');
            setEditingComment(null);
            setEditCommentContent("");
          }
        })}
        loading={updateComment.isLoading}
      />
      <ConfirmDialog
        open={open.deletePost}
        title="Delete Post"
        content="Are you sure you want to delete this post?"
        onClose={() => closeDialog('deletePost')}
        onConfirm={() => deletePost.mutate(editingPost._id, {
          onSuccess: () => {
            closeDialog('deletePost');
            setEditingPost(null);
          }
        })}
        loading={deletePost.isLoading}
        confirmText="Delete"
      />
      <ConfirmDialog
        open={open.deleteComment}
        title="Delete Comment"
        content="Are you sure you want to delete this comment?"
        onClose={() => closeDialog('deleteComment')}
        onConfirm={() => deleteComment.mutate({ postId: editingComment.postId, commentId: editingComment._id }, {
          onSuccess: () => {
            closeDialog('deleteComment');
            setEditingComment(null);
          }
        })}
        loading={deleteComment.isLoading}
        confirmText="Delete"
      />

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
          <UserList
            users={filteredFriends}
            loading={friendsLoading}
            emptyText="No friends found"
            onUserClick={friend => setUserToAdd(friend)}
            selectedUserId={userToAdd?._id}
            getSecondary={null}
            getActions={null}
            avatarSize={40}
            divider={true}
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
          <UserList
            users={group.members?.filter(m => m._id !== group.admin?._id)}
            onUserClick={member => setSelectedNewAdmin(member._id)}
            selectedUserId={selectedNewAdmin}
            getSecondary={null}
            getActions={null}
            avatarSize={40}
            divider={true}
          />
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
