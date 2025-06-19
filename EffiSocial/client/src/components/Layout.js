import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  ListItemAvatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  AccountCircle,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { users } from '../services/api';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotifications(user?._id || user?.id);
  const queryClient = useQueryClient();

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId) => users.acceptFriendRequest(requestId),
    onSuccess: () => {
      fetchNotifications();
      queryClient.invalidateQueries(['friends']);
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId) => users.rejectFriendRequest(requestId),
    onSuccess: () => {
      fetchNotifications();
    },
  });

  const handleAccept = (requestId) => {
    acceptRequestMutation.mutate(requestId);
  };

  const handleReject = (requestId) => {
    rejectRequestMutation.mutate(requestId);
  };

  const handleMenu = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    if (!user) {
      navigate('/login');
      return;
    }
    
    const userId = user._id || user.id;
    if (!userId) {
      return;
    }
    
    navigate(`/profile/${userId}`);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleNotificationsClick = (event) => {
    setNotificationAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleNotificationsClose = () => {
    setNotificationAnchorEl(null);
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Groups', icon: <GroupIcon />, path: '/groups' },
    { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            EffiSocial
          </Typography>

          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton color="inherit" component={RouterLink} to="/groups">
                <GroupIcon />
              </IconButton>
              <IconButton color="inherit" component={RouterLink} to="/chat">
                <Badge badgeContent={3} color="error">
                  <ChatIcon />
                </Badge>
              </IconButton>
              <IconButton color="inherit" onClick={handleNotificationsClick}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <Menu
                anchorEl={notificationAnchorEl}
                open={Boolean(notificationAnchorEl)}
                onClose={handleNotificationsClose}
                onClick={markAsRead}
                PaperProps={{ sx: { width: 350, maxHeight: 400 } }}
              >
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6">Notifications</Typography>
                </Box>
                <Divider />
                {notifications.length === 0 ? (
                  <MenuItem disabled>No notifications</MenuItem>
                ) : (
                  notifications.map((notification) => (
                    <MenuItem key={notification._id} sx={{ alignItems: 'flex-start' }}>
                      <ListItemAvatar>
                        <Avatar src={notification.avatar} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={notification.message}
                        secondary={new Date(notification.createdAt).toLocaleString()}
                      />
                      {notification.type === 'friend_request_incoming' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => handleAccept(notification._id)}
                            startIcon={<CheckIcon />}
                            disabled={acceptRequestMutation.isLoading}
                          >
                            Accept
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleReject(notification._id)}
                            startIcon={<CloseIcon />}
                            disabled={rejectRequestMutation.isLoading}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                    </MenuItem>
                  ))
                )}
              </Menu>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                {user.profilePicture ? (
                  <Avatar
                    src={user.profilePicture ? `http://localhost:5000${user.profilePicture}?t=${Date.now()}` : `http://localhost:5000/default-profile.png?t=${Date.now()}`}
                    alt={user.username}
                    sx={{ width: 32, height: 32 }}
                    onError={(e) => {
                      e.target.src = `http://localhost:5000/default-profile.png?t=${Date.now()}`;
                    }}
                  />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={userMenuAnchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(userMenuAnchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box>
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                sx={{ mr: 1 }}
              >
                Login
              </Button>
              <Button
                color="inherit"
                component={RouterLink}
                to="/register"
                variant="outlined"
              >
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={() => setDrawerOpen(false)}
        >
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          <Divider />
          {user && (
            <List>
              <ListItem button onClick={handleProfile}>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItem>
              <ListItem button onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItem>
            </List>
          )}
        </Box>
      </Drawer>

      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        {children}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} EffiSocial. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 