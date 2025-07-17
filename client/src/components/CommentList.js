import React from "react";
import { List, ListItem, Box, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import CommentMenu from "./CommentMenu";
import UserAvatar from "./UserAvatar";

const CommentList = ({
  comments,
  user,
  setEditingComment,
  setEditCommentContent,
  setEditCommentDialogOpen,
  setDeleteCommentDialogOpen,
}) => (
  <List>
    {comments.map((comment) => (
      <ListItem key={comment._id} alignItems="flex-start" sx={{ pl: 0 }}>
        <UserAvatar
          user={comment.author}
          sx={{ mr: 2, width: 32, height: 32 }}
        />
        <Box sx={{ p: 1, borderRadius: 2, flexGrow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="subtitle2"
              component={Link}
              to={`/profile/${comment.author?._id}`}
              sx={{
                textDecoration: "none",
                color: "inherit",
                fontWeight: "bold",
              }}
            >
              {comment.author?.username}
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ fontSize: "0.75rem" }}
            >
              {new Date(comment.createdAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
            {comment.author?._id === user?._id && (
              <CommentMenu
                comment={comment}
                user={user}
                onEdit={() => {
                  setEditingComment({ ...comment, postId: comment.postId });
                  setEditCommentContent(comment.content);
                  setEditCommentDialogOpen(true);
                }}
                onDelete={() => {
                  setEditingComment({ ...comment, postId: comment.postId });
                  setDeleteCommentDialogOpen(true);
                }}
              />
            )}
          </Box>
          <Typography variant="body1" sx={{ fontSize: "0.9rem" }}>
            {comment.content}
          </Typography>
        </Box>
      </ListItem>
    ))}
  </List>
);

export default CommentList;
