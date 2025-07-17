import React from "react";
import {
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  List,
  ListItem,
  TextField,
  IconButton,
} from "@mui/material";
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import CommentMenu from "./CommentMenu";
import PostMenu from "./PostMenu";
import MediaPreview from "./MediaPreview";
import UserAvatar from "./UserAvatar";
import CommentList from "./CommentList";

const PostCard = ({
  post,
  user,
  isLikedByCurrentUser,
  hasCommentedByCurrentUser,
  commentTexts,
  openCommentBoxId,
  onLike,
  onCommentClick,
  onCommentChange,
  onCommentSubmit,
  onEdit,
  onDelete,
  onOpenCommentBox,
  onCloseCommentBox,
  addCommentLoading,
  setEditingComment,
  setEditCommentContent,
  setEditCommentDialogOpen,
  setDeleteCommentDialogOpen,
}) => {
  return (
    <Card sx={{ mb: 3, width: "100%", borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", margin: "0 0 24px 0" }}>
      <CardContent>
        {/* Post header: author, date, menu */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <UserAvatar
            user={post.author}
            component={Link}
            to={`/profile/${post.author?._id}`}
            sx={{ mr: 2 }}
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
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Box>
        {/* Group chip if post is from a group */}
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
        {/* Post content and media */}
        <Typography
          variant="body1"
          sx={{ mt: 1, whiteSpace: "pre-wrap" }}
        >
          {post.content}
        </Typography>
        <MediaPreview
          media={post.media ? `http://localhost:5000${post.media}` : null}
          mediaType={post.mediaType}
        />
      </CardContent>
      <Divider />
      {/* Post actions: like, comment, share */}
      <CardActions sx={{ justifyContent: "space-around" }}>
        <Button
          sx={{ color: isLikedByCurrentUser ? "#ec4899" : "inherit", fontWeight: 'bold' }}
          startIcon={isLikedByCurrentUser ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          onClick={onLike}
        >
          Like ({post.likes.length})
        </Button>
        <Button
          sx={{ color: hasCommentedByCurrentUser ? "#ec4899" : "inherit", fontWeight: 'bold' }}
          startIcon={<CommentIcon />}
          onClick={onCommentClick}
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
      {/* Comment box for adding a new comment */}
      {openCommentBoxId === post._id && (
        <Box sx={{ p: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <UserAvatar
              user={user}
              sx={{ mr: 2, width: 32, height: 32 }}
            />
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Write a comment..."
              value={commentTexts[post._id] || ""}
              onChange={onCommentChange}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 20 } }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, mt: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="small"
              onClick={onCommentSubmit}
              disabled={addCommentLoading}
            >
              Post Comment
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={onCloseCommentBox}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}
      {/* List of comments for the post */}
      {post.comments.length > 0 && (
        <Box sx={{ p: 2 }}>
          <CommentList
            comments={post.comments}
            user={user}
            setEditingComment={setEditingComment}
            setEditCommentContent={setEditCommentContent}
            setEditCommentDialogOpen={setEditCommentDialogOpen}
            setDeleteCommentDialogOpen={setDeleteCommentDialogOpen}
          />
        </Box>
      )}
    </Card>
  );
};

export default PostCard; 