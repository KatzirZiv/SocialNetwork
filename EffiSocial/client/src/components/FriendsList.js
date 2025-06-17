import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  PersonRemove as PersonRemoveIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { users } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AddFriend from './AddFriend';

const FriendsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: friendsData, isLoading } = useQuery({
    queryKey: ['friends', user?._id],
    queryFn: () => users.getFriends(user?._id),
    enabled: !!user?._id,
  });

  const handleRemoveFriend = async (friendId) => {
    try {
      await users.removeFriend(user._id, friendId);
      // The query will automatically refetch due to React Query's cache invalidation
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleMessage = (friendId) => {
    navigate(`/messages/${friendId}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Ensure friends is always an array
  const friends = Array.isArray(friendsData?.data) ? friendsData.data : [];

  return (
    <>
      <AddFriend />
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Friends ({friends.length})
        </Typography>
        <List>
          {friends.map((friend) => (
            <React.Fragment key={friend._id}>
              <ListItem
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      aria-label="message"
                      onClick={() => handleMessage(friend._id)}
                      sx={{ mr: 1 }}
                    >
                      <MessageIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="remove"
                      onClick={() => handleRemoveFriend(friend._id)}
                    >
                      <PersonRemoveIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    src={friend.profilePicture ? `http://localhost:5000${friend.profilePicture}` : undefined}
                    alt={friend.username}
                  >
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={friend.username}
                  secondary="Friend"
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
          {friends.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No friends yet"
                secondary="Add friends to see them here"
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </>
  );
};

export default FriendsList; 