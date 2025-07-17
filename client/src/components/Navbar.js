import FriendRequests from "./FriendRequests";
import { Link } from "react-router-dom";
import { AppBar, Toolbar, Box, Container, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user } = useAuth();
  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              color: "#fff",
              textShadow: "1px 1px 4px rgba(0,0,0,0.7)",
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: 1.5,
            }}
          ></Typography>
          {user && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FriendRequests />
              <Link
                to="/statistics"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  fontWeight: 600,
                  marginLeft: 16,
                }}
              >
                Statistics
              </Link>
              <Link
                to="/settings"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  fontWeight: 600,
                  marginLeft: 16,
                }}
              >
                Settings
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
