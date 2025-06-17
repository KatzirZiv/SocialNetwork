import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { messages, users } from '../services/api';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

const Chat = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const socket = useSocket(currentUser?._id);

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messages.getAll(),
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedUser?._id],
    queryFn: () => messages.getConversation(selectedUser?._id),
    enabled: !!selectedUser,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => messages.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedUser?._id]);
    },
  });

  useEffect(() => {
    if (socket) {
      socket.on('user:online', (users) => {
        setOnlineUsers(users);
      });

      socket.on('message:new', (message) => {
        if (message.sender === selectedUser?._id || message.receiver === selectedUser?._id) {
          queryClient.invalidateQueries(['messages', selectedUser?._id]);
        }
        queryClient.invalidateQueries(['conversations']);
      });

      return () => {
        socket.off('user:online');
        socket.off('message:new');
      };
    }
  }, [socket, selectedUser?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && selectedUser) {
      sendMessageMutation.mutate({
        receiver: selectedUser._id,
        content: message,
      });
      setMessage('');
    }
  };

  if (conversationsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ height: 'calc(100vh - 100px)' }}>
      <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
        {/* Conversations List */}
        <Paper sx={{ width: 300, overflow: 'auto' }}>
          <List>
            {conversations?.data?.map((conversation) => {
              const otherUser = conversation.participants.find(
                (p) => p._id !== currentUser._id
              );
              return (
                <ListItem
                  key={conversation._id}
                  button
                  selected={selectedUser?._id === otherUser._id}
                  onClick={() => setSelectedUser(otherUser)}
                >
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar src={otherUser.avatar} alt={otherUser.username} />
                      {onlineUsers.includes(otherUser._id) && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 12,
                            height: 12,
                            bgcolor: 'success.main',
                            borderRadius: '50%',
                            border: '2px solid white',
                          }}
                        />
                      )}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={otherUser.username}
                    secondary={conversation.lastMessage?.content}
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {/* Chat Area */}
        <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Avatar
                  src={selectedUser.avatar}
                  alt={selectedUser.username}
                  sx={{ mr: 2 }}
                />
                <Box>
                  <Typography variant="subtitle1">
                    {selectedUser.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {onlineUsers.includes(selectedUser._id)
                      ? 'Online'
                      : 'Offline'}
                  </Typography>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {messagesLoading ? (
                  <CircularProgress />
                ) : (
                  messagesData?.data?.map((msg) => (
                    <Box
                      key={msg._id}
                      sx={{
                        display: 'flex',
                        justifyContent:
                          msg.sender === currentUser._id ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1,
                          maxWidth: '70%',
                          bgcolor:
                            msg.sender === currentUser._id
                              ? 'primary.main'
                              : 'grey.100',
                          color:
                            msg.sender === currentUser._id
                              ? 'primary.contrastText'
                              : 'text.primary',
                        }}
                      >
                        <Typography variant="body1">{msg.content}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </Typography>
                      </Paper>
                    </Box>
                  ))
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
                  borderColor: 'divider',
                  display: 'flex',
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
                  color="primary"
                  disabled={!message.trim() || sendMessageMutation.isLoading}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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