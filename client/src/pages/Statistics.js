import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import StatisticsGraphs from '../components/StatisticsGraphs';

export default function Statistics() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h4" fontWeight={700} align="center" mb={3}>
          Full Statistics
        </Typography>
        <StatisticsGraphs />
      </Paper>
    </Container>
  );
} 