import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages (to be created)
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Group from './pages/Group';
import Chat from './pages/Chat';
import Groups from './pages/Groups';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const queryClient = new QueryClient();

function App() {
  return (
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
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
