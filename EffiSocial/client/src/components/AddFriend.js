import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Cancel as CancelIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { users } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AddFriend = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('=== AddFriend Component ===');
  console.log('Auth user:', user);

  const searchMutation = useMutation({
    mutationFn: async (query) => {
      console.log('=== Search Mutation Function ===');
      console.log('Search query:', query);
      console.log('Current auth user:', user);
      const response = await users.search(query);
      console.log('Search mutation response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('=== Search Mutation Success ===');
      console.log('Search results data:', data);
      setSearchResults(data);
      setError(null);
    },
    onError: (error) => {
      console.error('=== Search Mutation Error ===');
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.error || 'Error searching users');
    }
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 3) {
        console.log('=== Debounced Search ===');
        console.log('Search query:', searchQuery);
        console.log('Current auth user:', user);
        setLoading(true);
        searchMutation.mutate(searchQuery, {
          onSettled: () => {
            console.log('=== Search Settled ===');
            setLoading(false);
          }
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendRequestMutation = useMutation({
    mutationFn: async (userId) => {
      console.log('=== Send Request Mutation Function ===');
      console.log('Sending friend request to:', userId);
      console.log('Current auth user:', user);
      const response = await users.sendFriendRequest(userId, user?.id || user?._id);
      console.log('Send request mutation response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('=== Send Request Mutation Success ===');
      console.log('Friend request sent successfully:', data);
      setError(null);
      // Optionally refresh search results
      if (searchQuery) {
        searchMutation.mutate(searchQuery);
      }
    },
    onError: (error) => {
      console.error('=== Send Request Mutation Error ===');
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.error || 'Error sending friend request');
    }
  });

  const handleSendRequest = async (userId) => {
    console.log('handleSendRequest called with:', { userId, user });
    try {
      const result = await sendRequestMutation.mutateAsync(userId);
      console.log('Friend request sent successfully:', result);
    } catch (error) {
      console.error('Send request error:', error);
    }
  };

  const handleProfileClick = (userId) => {
    console.log('Navigating to profile:', userId);
    navigate(`/profile/${userId}`);
  };

  // Filter out current user from search results
  const usersList = searchResults?.data?.filter(searchUser => {
    const isNotCurrentUser = searchUser._id !== (user?.id || user?._id);
    console.log('Filtering user:', {
      searchUserId: searchUser._id,
      currentUserId: user?.id || user?._id,
      isNotCurrentUser
    });
    return isNotCurrentUser;
  }) || [];

  const getFriendButtonState = (searchUser) => {
    const isFriend = searchUser.friends?.includes(user?._id);
    const hasPendingRequest = searchUser.friendRequests?.some(
      request => request.from === user?._id && request.status === 'pending'
    );
    const hasReceivedRequest = searchUser.friendRequests?.some(
      request => request.to === user?._id && request.status === 'pending'
    );

    if (isFriend) {
      return { 
        type: 'icon', 
        disabled: true, 
        icon: <CheckIcon />,
        color: 'success',
        sx: { 
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid',
          borderColor: 'success.main',
          color: 'success.main',
          '&:hover': {
            backgroundColor: 'success.light',
            borderColor: 'success.main',
          },
          padding: '0',
        }
      };
    } else if (hasPendingRequest) {
      return { 
        type: 'icon', 
        disabled: false, 
        icon: <CancelIcon />,
        color: 'error',
        sx: { 
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid',
          borderColor: 'error.main',
          color: 'error.main',
          '&:hover': {
            backgroundColor: 'error.light',
            borderColor: 'error.main',
          },
          padding: '0',
        }
      };
    } else if (hasReceivedRequest) {
      return { 
        type: 'button', 
        text: 'Respond', 
        disabled: false, 
        icon: <PersonAddIcon />,
        color: 'primary',
        variant: 'outlined',
        sx: { 
          minWidth: '100px',
          borderRadius: '20px',
          textTransform: 'none',
          fontWeight: 500,
          borderColor: 'primary.main',
          color: 'primary.main',
          '&:hover': {
            backgroundColor: 'primary.light',
            borderColor: 'primary.main',
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          px: '12px'
        }
      };
    } else {
      return { 
        type: 'button', 
        text: 'Add Friend', 
        disabled: false, 
        icon: <PersonAddIcon />,
        color: 'primary',
        variant: 'contained',
        sx: { 
          minWidth: '120px',
          borderRadius: '20px',
          textTransform: 'none',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          px: '12px'
        }
      };
    }
  };

  console.log('=== Search Results Processing ===');
  console.log('Raw search results:', searchResults);
  console.log('Current auth user:', user);
  console.log('Filtered users list:', usersList);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: 'transparent' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <Box sx={{ color: 'text.secondary', mr: 1 }}>
                <PersonIcon />
              </Box>
            ),
            sx: {
              borderRadius: '20px',
              backgroundColor: 'background.paper',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      ) : searchQuery.length >= 3 ? (
        <List sx={{ 
          bgcolor: 'background.paper',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          {usersList.map((user) => {
            const buttonState = getFriendButtonState(user);
            return (
              <ListItem
                key={user._id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none'
                  },
                  py: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                secondaryAction={
                  <>
                  {/* Use IconButton for icon-only buttons */}
                  {buttonState.type === 'icon' ? (
                    <IconButton
                      onClick={() => handleSendRequest(user._id)}
                      disabled={buttonState.disabled || sendRequestMutation.isLoading}
                      color={buttonState.color}
                      sx={buttonState.sx}
                    >
                      {buttonState.icon}
                    </IconButton>
                  ) : (
                    <Button
                      variant={buttonState.variant}
                      size="small"
                      startIcon={buttonState.icon}
                      onClick={() => handleSendRequest(user._id)}
                      disabled={buttonState.disabled || sendRequestMutation.isLoading}
                      color={buttonState.color}
                      sx={buttonState.sx}
                    >
                      {buttonState.text}
                    </Button>
                  )}
                  </>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : undefined}
                    alt={user.username}
                    onClick={() => handleProfileClick(user._id)}
                    sx={{ 
                      cursor: 'pointer',
                      width: 48,
                      height: 48,
                      border: '2px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: 'primary.main'
                      },
                      marginRight: '16px'
                    }}
                  >
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      component="span"
                      onClick={() => handleProfileClick(user._id)}
                      sx={{ 
                        cursor: 'pointer',
                        fontWeight: 500,
                        '&:hover': { 
                          color: 'primary.main',
                          textDecoration: 'underline'
                        },
                        flexGrow: 1,
                        flexShrink: 1,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginRight: '8px'
                      }}
                    >
                      {user.username}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      ) : null}
    </Box>
  );
};

export default AddFriend; 