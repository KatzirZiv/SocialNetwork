import FriendRequests from './FriendRequests';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          {/* ... existing logo and navigation ... */}
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FriendRequests />
              {/* ... existing user menu ... */}
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 