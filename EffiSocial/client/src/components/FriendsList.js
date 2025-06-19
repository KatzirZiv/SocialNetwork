import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Dialog,
  DialogTitle,
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

const FriendsList = ({ compact }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [findFriendsOpen, setFindFriendsOpen] = React.useState(false);

  const { data: friendsData, isLoading } = useQuery({
    queryKey: ['friends', user?._id],
    queryFn: () => users.getFriends(user?._id),
    enabled: !!user?._id,
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId) => users.removeFriend(user._id, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries(['friends', user?._id]);
    },
  });

  const handleRemoveFriend = (friendId) => {
    removeFriendMutation.mutate(friendId);
  };

  const handleMessage = (friend) => {
    navigate('/chat', {
      state: {
        userId: friend._id,
        username: friend.username,
        profilePicture: friend.profilePicture
      }
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Ensure friends is always an array
  const friends = Array.isArray(friendsData?.data?.data) ? friendsData.data.data : [];

  // Filter friends by search (case-insensitive)
  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {!compact && <AddFriend />}
      <Box sx={{ p: compact ? 0 : 2, pt: compact ? 0 : 2 }}>
        {(!compact) && (
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: 18, color: '#333' }}>Friends</Typography>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: compact ? 16 : 18, mb: compact ? 1 : 2, color: '#333' }}>
          Friends{friends.length > 0 ? ` (${friends.length})` : ''}
        </Typography>
        {compact && (
          <Box sx={{ mb: 1 }}>
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                borderRadius: 16,
                border: '1px solid #e0e0e0',
                fontSize: 14,
                outline: 'none',
                marginBottom: 4,
                background: '#fafbfc',
              }}
            />
          </Box>
        )}
        <List sx={{ p: 0 }}>
          {filteredFriends.map((friend) => (
            <React.Fragment key={friend._id}>
              <ListItem
                disableGutters
                sx={{
                  py: compact ? 0.5 : 1.5,
                  px: 0,
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
                secondaryAction={
                  !compact && (
                    <Box>
                      <IconButton
                        edge="end"
                        aria-label="message"
                        onClick={() => handleMessage(friend)}
                        sx={{ mr: 1 }}
                      >
                        <MessageIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="remove"
                        onClick={() => handleRemoveFriend(friend._id)}
                      >
                        <PersonRemoveIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )
                }
              >
                <ListItemAvatar sx={{ minWidth: 0, mr: 1 }}>
                  <Avatar
                    src={friend.profilePicture ? `http://localhost:5000${friend.profilePicture}` : 'http://localhost:5000/uploads/default-profile.png'}
                    alt={friend.username}
                    sx={{ width: compact ? 32 : 40, height: compact ? 32 : 40, fontSize: compact ? 16 : 20, cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${friend._id}`)}
                  >
                    <PersonIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 500, fontSize: compact ? 15 : 16, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} onClick={() => navigate(`/profile/${friend._id}`)}>{friend.username}</Typography>}
                  secondary={compact ? null : 'Friend'}
                  sx={{ m: 0 }}
                />
                {compact && (
                  <IconButton
                    edge="end"
                    aria-label="message"
                    onClick={() => handleMessage(friend)}
                    sx={{ ml: 0.5 }}
                  >
                    <MessageIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItem>
              {compact ? <Divider sx={{ ml: 5, mr: 0 }} /> : <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
          {filteredFriends.length === 0 && (
            <ListItem>
              <ListItemText
                primary={<Typography sx={{ fontSize: compact ? 14 : 16, color: '#888' }}>No friends found</Typography>}
                secondary={compact ? null : 'Add friends to see them here'}
              />
            </ListItem>
          )}
        </List>
        {compact && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <button
              style={{
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '6px 18px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(25, 118, 210, 0.08)',
                transition: 'background 0.2s',
              }}
              onClick={() => setFindFriendsOpen(true)}
            >
              Find Friends
            </button>
          </Box>
        )}
      </Box>
      <Dialog open={findFriendsOpen} onClose={() => setFindFriendsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Find Friends</DialogTitle>
        <Box sx={{ p: 2 }}>
          <AddFriend />
        </Box>
      </Dialog>
    </>
  );
};

export default FriendsList; 