import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages (to be created)
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Group from "./pages/Group";
import Chat from "./pages/Chat";
import Groups from "./pages/Groups";
import Statistics from "./pages/Statistics";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#ffb6d5",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f7f9fb",
      paper: "#fff",
    },
    text: {
      primary: "#222",
      secondary: "#555",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",
    fontSize: 16,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        },
      },
    },
  },
});

const queryClient = new QueryClient();

function App() {
  return (
    <div className="app-container">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Home />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/:id"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Profile />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/groups"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Groups />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/groups/:id"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Group />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Chat />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/statistics"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Statistics />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
