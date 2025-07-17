import React, { useState } from "react";
import {
  Paper,
  Box,
  TextField,
  Button,
  IconButton,
  Divider,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import {
  Image as ImageIcon,
  VideoLibrary as VideoLibraryIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import UserAvatar from "./UserAvatar";

const PostForm = ({
  user,
  onSubmit,
  loading = false,
  error = "",
  groups = [],
  groupMode = false,
  initialContent = "",
  initialGroup = "",
  groupId = undefined,
}) => {
  const [content, setContent] = useState(initialContent);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setVideoFile(null);
      setVideoPreview(null);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !videoFile) return;
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
    formData.append("content", content);
    if (file) {
      formData.append("media", file);
      formData.append("mediaType", mediaType);
    }
    if (groupMode && selectedGroup) {
      formData.append("group", selectedGroup);
    }
    if (groupId) {
      formData.append("group", groupId);
    }
    onSubmit(formData, {
      reset: () => {
        setContent("");
        setImageFile(null);
        setImagePreview(null);
        setVideoFile(null);
        setVideoPreview(null);
        setSelectedGroup(initialGroup);
      },
    });
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <UserAvatar user={user} sx={{ mr: 2, width: 48, height: 48 }} />
          <TextField
            fullWidth
            variant="outlined"
            placeholder={`What's on your mind${user?.username ? ", " + user.username : ""}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
        {groupMode && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="group-select-label">Group</InputLabel>
            <Select
              labelId="group-select-label"
              value={selectedGroup}
              label="Group"
              onChange={e => setSelectedGroup(e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {groups.map(group => (
                <MenuItem key={group._id} value={group._id}>{group.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
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
              <img
                src={imagePreview}
                alt="Preview"
                style={{ width: '100%', borderRadius: '12px', display: 'block', maxHeight: 220, objectFit: 'contain' }}
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
            <IconButton onClick={() => document.getElementById('video-upload').click()} size="small">
              <VideoLibraryIcon fontSize="small" /> Video
            </IconButton>
          </Box>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (!content.trim() && !imageFile && !videoFile)}
            sx={{ borderRadius: 2 }}
          >
            {loading ? "Posting..." : "Post"}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default PostForm; 