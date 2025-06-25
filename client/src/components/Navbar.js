import FriendRequests from './FriendRequests';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          {/* ... existing logo and navigation ... */}
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FriendRequests />
              <Link to="/statistics" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600, marginLeft: 16 }}>
                Statistics
              </Link>
              {/* ... existing user menu ... */}
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 