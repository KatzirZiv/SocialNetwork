// Chat.js - Direct messaging page for chatting with friends
// Handles conversations, real-time messages, online status, and message sending

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { messages, users } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useSocket from "../hooks/useSocket";
import { useLocation, Link } from "react-router-dom";
import UserAvatar from "../components/UserAvatar";
import UserList from "../components/UserList";

const Chat = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  // State for selected user to chat with
  const [selectedUser, setSelectedUser] = useState(null);
  // State for message input
  const [message, setMessage] = useState("");
  // Ref for scrolling to latest message
  const messagesEndRef = useRef(null);
  // State for online users (from socket)
  const [onlineUsers, setOnlineUsers] = useState([]);
  const location = useLocation();

  // Initialize socket connection for real-time updates
  const socket = useSocket(currentUser?._id);

  // Fetch all conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messages.getAll(),
  });

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", selectedUser?._id],
    queryFn: () => messages.getConversation(selectedUser?._id),
    enabled: !!selectedUser,
  });

  // Fetch current user's friends (for conversation list)
  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", currentUser?._id],
    queryFn: () => users.getFriends(currentUser._id),
    enabled: !!currentUser?._id,
  });

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: (data) => messages.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["messages", selectedUser?._id]);
    },
  });

  // Listen for online users and new messages via socket
  useEffect(() => {
    if (socket) {
      socket.on("user:online", (users) => {
        setOnlineUsers(users);
      });

      socket.on("message:new", (message) => {
        if (
          message.sender === selectedUser?._id ||
          message.receiver === selectedUser?._id
        ) {
          queryClient.invalidateQueries(["messages", selectedUser?._id]);
        }
        queryClient.invalidateQueries(["conversations"]);
      });

      return () => {
        socket.off("user:online");
        socket.off("message:new");
      };
    }
  }, [socket, selectedUser?._id]);

  // Scroll to latest message when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  // Pre-select user if navigated from profile page
  useEffect(() => {
    if (
      location.state &&
      location.state.userId &&
      friendsData &&
      Array.isArray(friendsData.data?.data)
    ) {
      const user = friendsData.data.data.find(
        (f) => f._id === location.state.userId
      );
      if (user) {
        setSelectedUser(user);
      }
    }
    // eslint-disable-next-line
  }, [location.state, friendsData]);

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && selectedUser) {
      sendMessageMutation.mutate({
        receiver: selectedUser._id,
        content: message,
      });
      setMessage("");
    }
  };

  // Helper to get profile picture or fallback
  const getProfilePicture = (user) =>
    user?.profilePicture
      ? `http://localhost:5000${user.profilePicture}`
      : `http://localhost:5000/uploads/default-profile.png`;

  // Helper to get secondary text for conversation preview
  const getSecondary = (friend) => {
    const conversationList = Array.isArray(conversations?.data?.data)
      ? conversations.data.data
      : [];
    const conversation = conversationList.find((c) =>
      c.participants.some((p) => p._id?.toString() === friend._id?.toString())
    );
    return !conversation
      ? "No messages yet. Say hello!"
      : conversation.lastMessage?.content || "Conversation started";
  };

  // Online indicator as an action
  const getActions = (friend) =>
    onlineUsers.includes(friend._id) ? (
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 12,
          height: 12,
          bgcolor: "success.main",
          borderRadius: "50%",
          border: "2px solid white",
        }}
      />
    ) : null;

  if (conversationsLoading) {
    // Show loading spinner while conversations are loading
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ height: "calc(100vh - 100px)" }}>
      <Box sx={{ display: "flex", height: "100%", gap: 2 }}>
        {/* Conversations List */}
        <Paper sx={{ width: 300, overflow: "auto" }}>
          <UserList
            users={
              Array.isArray(friendsData?.data?.data)
                ? friendsData.data.data
                : []
            }
            loading={friendsLoading}
            emptyText="No friends found"
            getActions={getActions}
            getSecondary={getSecondary}
            avatarSize={40}
            divider={true}
            onUserClick={setSelectedUser}
            selectedUserId={selectedUser?._id}
            showSearch={false}
            sx={{ position: "relative" }}
          />
        </Paper>

        {/* Chat Area */}
        <Paper sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <UserAvatar user={selectedUser} size={40} sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="subtitle1">
                    <Link
                      to={`/profile/${selectedUser._id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        fontWeight: 500,
                      }}
                    >
                      {selectedUser.username}
                    </Link>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {onlineUsers.includes(selectedUser._id)
                      ? "Online"
                      : "Offline"}
                  </Typography>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: "auto",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {messagesLoading ? (
                  <CircularProgress />
                ) : (
                  (Array.isArray(messagesData?.data?.data)
                    ? messagesData.data.data
                    : []
                  ).map((msg) => {
                    const isOwn =
                      msg.sender === currentUser._id ||
                      msg.sender?._id === currentUser._id;
                    const sender = isOwn ? currentUser : selectedUser;
                    return (
                      <Box
                        key={msg._id}
                        sx={{
                          display: "flex",
                          justifyContent: isOwn ? "flex-start" : "flex-end",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        {!isOwn && (
                          <UserAvatar
                            user={selectedUser}
                            size={32}
                            sx={{ mr: 1 }}
                          />
                        )}
                        <Paper
                          sx={{
                            p: 1,
                            maxWidth: "70%",
                            bgcolor: isOwn ? "#ffb6d5" : "grey.100",
                            color: isOwn ? "#fff" : "text.primary",
                          }}
                        >
                          {!isOwn && (
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                              <Link
                                to={`/profile/${selectedUser._id}`}
                                style={{
                                  textDecoration: "none",
                                  color: "inherit",
                                  fontWeight: 500,
                                }}
                              >
                                {selectedUser.username}
                              </Link>
                            </Typography>
                          )}
                          <Typography variant="body1">{msg.content}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </Typography>
                        </Paper>
                        {isOwn && (
                          <UserAvatar
                            user={currentUser}
                            size={32}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 2,
                  borderTop: 1,
                  borderColor: "divider",
                  display: "flex",
                  gap: 1,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  size="small"
                />
                <IconButton
                  type="submit"
                  sx={{
                    backgroundColor: "#ffb6d5",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#ffd1ea" },
                  }}
                  disabled={!message.trim() || sendMessageMutation.isLoading}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="h6" color="text.secondary">
                Select a conversation to start chatting
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Chat;
