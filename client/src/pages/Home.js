// Home.js - Main feed and post interaction page for the social network
// This component handles displaying posts, creating new posts, filtering, liking, commenting, and more.

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Paper, CircularProgress } from "@mui/material";
import { posts, groups, users } from "../services/api";
import { useAuth } from "../context/AuthContext";
import FriendsList from "../components/FriendsList";
import StatisticsGraphs from "../components/StatisticsGraphs";
import PostCard from "../components/PostCard";
import ConfirmDialog from "../components/ConfirmDialog";
import EditDialog from "../components/EditDialog";
import useCommentInput from "../hooks/useCommentInput";
import usePostMutations from "../hooks/usePostMutations";
import PostForm from "../components/PostForm";
import useDialogState from "../hooks/useDialogState";

const Home = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // State for new post content
  const [newPost, setNewPost] = useState("");
  // State for image file and preview for new post
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  // State for video file and preview for new post
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  // State for menu anchor (for image/video menu popups)
  const [anchorEl, setAnchorEl] = useState(null);
  // State for selected group when posting to a group
  const [selectedGroup, setSelectedGroup] = useState("");
  // State for error messages
  const [error, setError] = useState("");
  // State for controlling group selection dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  // State for comment text per post (object: postId -> text)
  const [commentTexts, handleCommentChange, setCommentTexts] =
    useCommentInput();
  // Dialog states for editing/deleting posts/comments
  const { open, openDialog, closeDialog } = useDialogState([
    "editPost",
    "editComment",
    "deletePost",
    "deleteComment",
  ]);
  // State for currently editing post/comment
  const [editingPost, setEditingPost] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  // State for content being edited (post/comment)
  const [editPostContent, setEditPostContent] = useState("");
  const [editCommentContent, setEditCommentContent] = useState("");
  // Optimistic UI state for likes (postId -> likes array)
  const [optimisticLikes, setOptimisticLikes] = useState({});
  // State to control which comment box is open (postId)
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);
  // State for filter dialog and filter values
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  // Filters for posts (group, author, media type, date range, sort)
  const [filters, setFilters] = useState({
    group: "",
    author: "",
    mediaType: "",
    startDate: "",
    endDate: "",
    sort: "desc",
  });
  // Pending filters (used in dialog before applying)
  const [pendingFilters, setPendingFilters] = useState(filters);

  // Fetch posts with current filters using React Query
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", filters],
    queryFn: () =>
      posts.getAll({
        group: filters.group,
        author: filters.author,
        mediaType: filters.mediaType,
        startDate: filters.startDate
          ? new Date(filters.startDate).toISOString()
          : undefined,
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

  // Fetch all groups for group filter and post creation
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => groups.getAll(),
  });

  // Remove all direct useMutation hooks for posts/comments
  // Integrate usePostMutations
  const {
    createPost,
    updatePost,
    deletePost,
    likePost,
    addComment,
    updateComment,
    deleteComment,
  } = usePostMutations({ queryClient, user });

  // Mutation for creating a new post (text, image, video, group)
  // const createPostMutation = useMutation({ ... });
  // Mutation for liking/unliking a post with optimistic UI update
  // const likePostMutation = useMutation({ ... });
  // Mutation for adding a comment to a post
  // const addCommentMutation = useMutation({ ... });
  // Mutation for updating a post's content
  // const updatePostMutation = useMutation({ ... });
  // Mutation for deleting a post
  // const deletePostMutation = useMutation({ ... });
  // Mutation for updating a comment's content
  // const updateCommentMutation = useMutation({ ... });
  // Mutation for deleting a comment
  // const deleteCommentMutation = useMutation({ ... });

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
    if (selectedGroup) {
      formData.append("group", selectedGroup);
    }
    createPost.mutate(formData, {
      onSuccess: () => {
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
    document.getElementById("video-upload").click();
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
    const isLiked = post.likes.some(
      (like) => like === user?._id || like?._id === user?._id
    );
    likePost.mutate({ postId, isLiked });
  };

  const handleCommentClick = (postId) => {
    setOpenCommentBoxId(openCommentBoxId === postId ? null : postId);
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

  useEffect(() => {
    if (open.editPost && editingPost) {
      setEditPostContent(editingPost.content || "");
    }
  }, [open.editPost, editingPost]);

  useEffect(() => {
    if (imagePreview) {
      const canvas = document.getElementById("image-preview-canvas");
      if (canvas) {
        const ctx = canvas.getContext("2d");
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
    // Show loading spinner while posts or groups are loading
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Prepare lists for groups and posts
  const groupsList = Array.isArray(groupsData?.data?.data)
    ? groupsData.data.data
    : [];
  const postsList = Array.isArray(postsData?.data?.data)
    ? postsData.data.data
    : [];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 0, md: "24px" },
        alignItems: "flex-start",
        width: "100%",
        minWidth: 0,
        minHeight: "100vh",
        boxSizing: "border-box",
        px: 0,
        m: 0,
      }}
    >
      {/* Left: Statistics panel (hidden on mobile) */}
      <Box
        sx={{
          flex: "0 0 260px",
          maxWidth: 260,
          width: { xs: "100%", md: 260 },
          display: { xs: "none", md: "block" },
          p: 0,
          m: 0,
        }}
      >
        <Box sx={{ m: 0, p: 0 }}>
          <StatisticsGraphs />
        </Box>
      </Box>
      {/* Center: Main feed and post creation */}
      <Box
        sx={{
          flex: 1,
          minWidth: 500,
          maxWidth: { md: "calc(100vw - 520px)" },
          width: "100%",
          margin: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Filter Button and Dialog */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          {/* Opens the filter dialog for posts */}
          <button
            className="project-ui-btn contained"
            style={{
              background: "#42a5f5",
              color: "#fff",
              border: "1.5px solid #42a5f5",
              boxShadow: "0 1px 4px rgba(66,165,245,0.08)",
              padding: "8px 28px",
              borderRadius: "20px",
              fontWeight: 600,
              fontSize: "1rem",
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
            }}
            onMouseOver={e => e.currentTarget.style.background = "#90caf9"}
            onMouseOut={e => e.currentTarget.style.background = "#42a5f5"}
            onClick={() => {
              setPendingFilters(filters);
              setFilterDialogOpen(true);
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: 0.5 }}>
              Filter
            </span>
          </button>
        </Box>
        {filterDialogOpen && (
          // Custom modal for filtering posts
          <div className="custom-modal-overlay">
            <div className="custom-modal project-ui-modal">
              <h2
                style={{
                  margin: 0,
                  marginBottom: 18,
                  fontWeight: 700,
                  fontSize: 24,
                  color: "#ff4fa3",
                  fontFamily: "Inter, Roboto, Arial, sans-serif",
                  letterSpacing: 0.5,
                }}
              >
                Filter Posts
              </h2>
              {/* Filter fields for group, author, media type, date, sort */}
              <label>
                Group
                <select
                  value={pendingFilters.group}
                  onChange={(e) =>
                    setPendingFilters((f) => ({ ...f, group: e.target.value }))
                  }
                >
                  <option value="">All</option>
                  {groupsList.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Author ID
                <input
                  type="text"
                  value={pendingFilters.author}
                  onChange={(e) =>
                    setPendingFilters((f) => ({ ...f, author: e.target.value }))
                  }
                  placeholder="Enter user ID or leave blank for all"
                />
              </label>
              <label>
                Media Type
                <select
                  value={pendingFilters.mediaType}
                  onChange={(e) =>
                    setPendingFilters((f) => ({
                      ...f,
                      mediaType: e.target.value,
                    }))
                  }
                >
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
                  onChange={(e) =>
                    setPendingFilters((f) => ({
                      ...f,
                      startDate: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                End Date
                <input
                  type="date"
                  value={pendingFilters.endDate}
                  onChange={(e) =>
                    setPendingFilters((f) => ({
                      ...f,
                      endDate: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Sort
                <select
                  value={pendingFilters.sort}
                  onChange={(e) =>
                    setPendingFilters((f) => ({ ...f, sort: e.target.value }))
                  }
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 24,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="project-ui-btn outlined"
                  onClick={() =>
                    setPendingFilters({
                      group: "",
                      author: "",
                      mediaType: "",
                      startDate: "",
                      endDate: "",
                      sort: "desc",
                    })
                  }
                >
                  Reset Filters
                </button>
                <button
                  className="project-ui-btn outlined"
                  onClick={() => setFilterDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="project-ui-btn contained"
                  onClick={() => {
                    setFilters(pendingFilters);
                    setFilterDialogOpen(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
            {/* Modal styles omitted for brevity */}
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
          <PostForm
            user={user}
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
        {/* Main feed: list of posts */}
        {postsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ width: "100%", maxWidth: 680, margin: "0 auto" }}>
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
                <PostCard
                  key={post._id}
                  post={post}
                  user={user}
                  isLikedByCurrentUser={isLikedByCurrentUser}
                  hasCommentedByCurrentUser={hasCommentedByCurrentUser}
                  commentTexts={commentTexts}
                  openCommentBoxId={openCommentBoxId}
                  onLike={() => handleLike(post._id)}
                  onCommentClick={() => handleCommentClick(post._id)}
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
                  setDeleteCommentDialogOpen={() => openDialog("deleteComment")}
                />
              );
            })}
          </Box>
        )}
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
      </Box>
      {/* Right: Friends list panel (hidden on mobile) */}
      <Box
        sx={{
          flex: "0 0 260px",
          maxWidth: 260,
          width: { xs: "100%", md: 260 },
          display: { xs: "none", md: "block" },
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
